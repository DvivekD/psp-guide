const { ClientSecretCredential } = require("@azure/identity");
const { ComputeManagementClient } = require("@azure/arm-compute");
const { NetworkManagementClient } = require("@azure/arm-network");

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
    const networkClient = new NetworkManagementClient(credential, SUBSCRIPTION_ID);

    console.log("Fetching VM details...");
    const vm = await computeClient.virtualMachines.get(RESOURCE_GROUP, VM_NAME);
    
    console.log("--- VM Configuration ---");
    console.log("Size:", vm.hardwareProfile.vmSize);
    console.log("OS Disk Type:", vm.storageProfile.osDisk.managedDisk.storageAccountType);
    console.log("OS Disk Size (GB):", vm.storageProfile.osDisk.diskSizeGB || "Default");
    
    if (vm.storageProfile.dataDisks.length > 0) {
      console.log("Data Disks:", vm.storageProfile.dataDisks.length);
    } else {
      console.log("Data Disks: None");
    }

    console.log("\Fetching Network details...");
    // Let's find the public IP address
    const publicIps = await networkClient.publicIPAddresses.list(RESOURCE_GROUP);
    for await (const ip of publicIps) {
      console.log("--- Public IP Configuration ---");
      console.log("Name:", ip.name);
      console.log("Allocation Method:", ip.publicIPAllocationMethod);
      console.log("SKU:", ip.sku ? ip.sku.name : "Basic");
    }

  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
