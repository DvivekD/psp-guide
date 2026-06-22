const { ClientSecretCredential } = require("@azure/identity");
const { ComputeManagementClient } = require("@azure/arm-compute");

const SUBSCRIPTION_ID = "addb13a3-1872-462c-bde5-a9868c58cf3b";
const RESOURCE_GROUP = "rei_group_05271705";
const VM_NAME = "rei";

async function main() {
  try {
    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET
    );

    const computeClient = new ComputeManagementClient(credential, SUBSCRIPTION_ID);

    console.log("Starting VM...");
    await computeClient.virtualMachines.beginStartAndWait(RESOURCE_GROUP, VM_NAME);
    console.log("VM started successfully!");

  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
