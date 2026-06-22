const { ClientSecretCredential } = require("@azure/identity");
const { ComputeManagementClient } = require("@azure/arm-compute");
const { NetworkManagementClient } = require("@azure/arm-network");

const SUBSCRIPTION_ID = "addb13a3-1872-462c-bde5-a9868c58cf3b";
const RESOURCE_GROUP = "rei_group_05271705";
const VM_NAME = "rei";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const { key } = req.query;
    if (!key || key !== process.env.API_KEY) {
      return res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
    }

    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET
    );

    const computeClient = new ComputeManagementClient(credential, SUBSCRIPTION_ID);
    const networkClient = new NetworkManagementClient(credential, SUBSCRIPTION_ID);

    // Get instance view for power state
    const instanceView = await computeClient.virtualMachines.instanceView(
      RESOURCE_GROUP,
      VM_NAME
    );

    const powerStatus = instanceView.statuses.find((s) => s.code.startsWith("PowerState/"));
    const powerState = powerStatus ? powerStatus.code.replace("PowerState/", "") : "unknown";

    // Get public IP only if VM is running
    let publicIp = null;
    if (powerState === "running") {
      try {
        const vm = await computeClient.virtualMachines.get(RESOURCE_GROUP, VM_NAME);
        const nicId = vm.networkProfile.networkInterfaces[0].id;
        const nicName = nicId.split("/").pop();

        const nic = await networkClient.networkInterfaces.get(RESOURCE_GROUP, nicName);
        const ipConfigId = nic.ipConfigurations[0].publicIPAddress?.id;

        if (ipConfigId) {
          const ipName = ipConfigId.split("/").pop();
          const ipResource = await networkClient.publicIPAddresses.get(RESOURCE_GROUP, ipName);
          publicIp = ipResource.ipAddress || null;
        }
      } catch (ipErr) {
        console.error("IP lookup failed:", ipErr.message);
      }
    }

    // Get WARP status if VM is running
    let warp = null;
    if (powerState === "running" && publicIp) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const healthRes = await fetch(`http://${publicIp}:8082/health`, { signal: controller.signal });
        clearTimeout(timeout);
        if (healthRes.ok) {
          warp = await healthRes.json();
        }
      } catch (healthErr) {
        warp = { warp: "unreachable", socks5: false, detail: healthErr.message };
      }
    }

    // Get Oracle status
    let oracleStatus = "offline";
    let oracleWarp = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const oracleRes = await fetch(`http://upbackup67dev.duckdns.org:8082/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (oracleRes.ok) {
        oracleStatus = "online";
        oracleWarp = await oracleRes.json();
      }
    } catch (oracleErr) {
      oracleStatus = "offline";
    }

    return res.status(200).json({
      azure: {
        vm: VM_NAME,
        powerState,
        ip: publicIp,
        warp: warp ? warp.warp : null,
        socks5: warp ? warp.socks5 : null,
      },
      oracle: {
        status: oracleStatus,
        warp: oracleWarp ? oracleWarp.warp : null,
        socks5: oracleWarp ? oracleWarp.socks5 : null,
      }
    });
  } catch (err) {
    console.error("Status error:", err);
    return res.status(500).json({
      error: "Failed to get VM status",
      details: err.message,
    });
  }
};
