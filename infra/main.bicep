param location string = 'westeurope'
param appName string = 'swa-appelodlingen-prod'
param cosmosEndpoint string

@secure()
param cosmosKey string

param cosmosDatabase string = 'appelodlingen'

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: appName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

resource swaAppSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    COSMOS_ENDPOINT: cosmosEndpoint
    COSMOS_KEY: cosmosKey
    COSMOS_DATABASE: cosmosDatabase
  }
}

output swaHostname string = swa.properties.defaultHostname
output swaDeploymentToken string = swa.listSecrets().properties.apiKey
