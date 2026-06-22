
const { ClientSecretCredential } = require("@azure/identity");
const { NetworkManagementClient } = require("@azure/arm-network");

const SUBSCRIPTION_ID = "addb13a3-1872-462c-bde5-a9868c58cf3b";
const RESOURCE_GROUP = "rei_group_05271705";
const NSG_NAME = "rei-nsg"; // common default format, let's look up the NSG first if this fails

async function main() {
  try {
    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET
    );

    const client = new NetworkManagementClient(credential, SUBSCRIPTION_ID);

    // List NSGs to get the right one
    const nsgs = await client.networkSecurityGroups.list(RESOURCE_GROUP);
    let nsgName = "";
    for await (const nsg of nsgs) {
      nsgName = nsg.name;
      break;
    }
    
    if (!nsgName) {
      console.error("No NSG found in resource group");
      return;
    }
    console.log("Found NSG:", nsgName);

    console.log("Adding rule for port 8086...");
    await client.securityRules.beginCreateOrUpdateAndWait(
      RESOURCE_GROUP,
      nsgName,
      "AllowHealthServer8086",
      {
        protocol: "Tcp",
        sourcePortRange: "*",
        destinationPortRange: "8086",
        sourceAddressPrefix: "*",
        destinationAddressPrefix: "*",
        access: "Allow",
        priority: 1086, // make sure priority is unique
        direction: "Inbound",
        description: "Allow health server"
      }
    );
    console.log("Port 8086 opened successfully!");
  } catch (e) {
    console.error("Error:", e.message);
  }
}

main();
