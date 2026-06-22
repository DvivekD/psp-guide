const { ClientSecretCredential } = require("@azure/identity");
const { ComputeManagementClient } = require("@azure/arm-compute");

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

    // Deallocate the VM (stops and releases compute resources — no billing)
    const deallocatePoller = await computeClient.virtualMachines.beginDeallocate(
      RESOURCE_GROUP,
      VM_NAME
    );
    await deallocatePoller.pollUntilDone();

    return res.status(200).json({
      status: "deallocated",
      vm: VM_NAME,
      message: "VM deallocated successfully",
    });
  } catch (err) {
    console.error("Sleep error:", err);
    return res.status(500).json({
      error: "Failed to deallocate VM",
      details: err.message,
    });
  }
};
