const { ClientSecretCredential } = require("@azure/identity");
const { ComputeManagementClient } = require("@azure/arm-compute");
const { NetworkManagementClient } = require("@azure/arm-network");

const SUBSCRIPTION_ID = "addb13a3-1872-462c-bde5-a9868c58cf3b";
const RESOURCE_GROUP = "rei_group_05271705";
const VM_NAME = "rei";
const DUCKDNS_DOMAIN = "upbackup67dev";

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

    // Start the VM
    const startPoller = await computeClient.virtualMachines.beginStart(RESOURCE_GROUP, VM_NAME);
    await startPoller.pollUntilDone();

    // Wait briefly for networking to stabilize
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Get the VM to find its network interface
    const vm = await computeClient.virtualMachines.get(RESOURCE_GROUP, VM_NAME);
    const nicId = vm.networkProfile.networkInterfaces[0].id;
    const nicName = nicId.split("/").pop();

    const nic = await networkClient.networkInterfaces.get(RESOURCE_GROUP, nicName);
    const ipConfigId = nic.ipConfigurations[0].publicIPAddress?.id;

    let publicIp = null;
    if (ipConfigId) {
      const ipName = ipConfigId.split("/").pop();
      const ipResource = await networkClient.publicIPAddresses.get(RESOURCE_GROUP, ipName);
      publicIp = ipResource.ipAddress || null;
    }

    // Update DuckDNS
    if (publicIp && process.env.DUCKDNS_TOKEN) {
      const duckUrl = `https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${process.env.DUCKDNS_TOKEN}&ip=${publicIp}`;
      try {
        await fetch(duckUrl);
      } catch (dnsErr) {
        console.error("DuckDNS update failed:", dnsErr.message);
      }
    }

    return res.status(200).json({
      status: "running",
      vm: VM_NAME,
      ip: publicIp,
      duckdns: `${DUCKDNS_DOMAIN}.duckdns.org`,
      message: "VM started successfully",
    });
  } catch (err) {
    console.error("Wake error:", err);
    return res.status(500).json({
      error: "Failed to start VM",
      details: err.message,
    });
  }
};
