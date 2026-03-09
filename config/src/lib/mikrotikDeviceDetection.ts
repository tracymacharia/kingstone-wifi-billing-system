/**
 * Mikrotik Device Detection and Model Recognition
 * Detects Mikrotik router models and provides model-specific configuration data
 * including port layouts, wireless capabilities, and feature support
 */

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export type MikrotikSeries = 'hAP' | 'cAP' | 'wAP' | 'RB' | 'CSS' | 'CRS' | 'LHG' | 'SXT' | 'Groove' | 'OmniTik' | 'PowerBox' | 'mAP';

export type PortType = 'ethernet' | 'sfp' | 'sfp_plus' | 'combo' | 'poe_in' | 'poe_out';

export type WirelessStandard = '802.11b' | '802.11g' | '802.11n' | '802.11ac' | '802.11ax' | '802.11ad';

export interface MikrotikModel {
  id: string;
  name: string;
  series: MikrotikSeries;
  manufacturer: 'MikroTik';
  releaseYear: number;
  architecture: 'arm' | 'mipsbe' | 'mipsle' | 'x86' | 'arm64';
  cpu: {
    cores: number;
    frequency: number; // MHz
    model: string;
  };
  ram: {
    size: number; // MB
    type: string;
  };
  storage: {
    size: number; // MB
    type: 'nand' | 'nor' | 'sd_card' | 'emmc';
  };
  ethernetPorts: EthernetPort[];
  wireless?: WirelessConfig;
  poe: PoEConfig;
  features: FeatureSet;
  dimensions: {
    width: number; // mm
    height: number; // mm
    depth: number; // mm
  };
  powerConsumption: {
    min: number; // W
    max: number; // W
  };
  operatingTemp: {
    min: number; // °C
    max: number; // °C
  };
  image?: string;
}

export interface EthernetPort {
  id: number;
  name: string;
  type: PortType;
  speed: '10/100' | '10/100/1000' | '2.5G' | '10G';
  poeIn?: boolean;
  poeOut?: boolean;
  poeStandard?: '802.3af' | '802.3at' | 'passive';
  maxPoeOutput?: number; // W
  comment?: string;
}

export interface WirelessConfig {
  enabled: boolean;
  standards: WirelessStandard[];
  chains: string; // e.g., "2T2R" (2 transmit, 2 receive)
  antennaGain: number; // dBi
  frequencyBands: {
    '2.4GHz'?: boolean;
    '5GHz'?: boolean;
    '6GHz'?: boolean;
  };
  maxTxPower: number; // dBm
  ssidCount: number;
  features: {
    muMimo: boolean;
    beamforming: boolean;
    mesh: boolean;
    apMode: boolean;
    stationMode: boolean;
    bridgeMode: boolean;
  };
}

export interface PoEConfig {
  supported: boolean;
  type: 'input' | 'output' | 'both' | 'none';
  inputVoltage?: number; // V
  outputVoltage?: number; // V
  maxOutputPower?: number; // W
  ports?: number[]; // Port IDs that support PoE out
  standard: '802.3af' | '802.3at' | 'passive' | 'none';
}

export interface FeatureSet {
  hotspot: boolean;
  pppoe: boolean;
  vlan: boolean;
  qos: boolean;
  firewall: boolean;
  vpn: {
    pptp: boolean;
    l2tp: boolean;
    ipsec: boolean;
    openvpn: boolean;
    wireguard: boolean;
  };
  routing: {
    static: boolean;
    rip: boolean;
    ospf: boolean;
    bgp: boolean;
  };
  wireless: boolean;
  cloud: boolean;
  docker: boolean;
  switch: boolean;
  layer3: boolean;
}

export interface DeviceDetectionResult {
  detected: boolean;
  model?: MikrotikModel;
  confidence: number; // 0-1
  identity?: string;
  routerOSVersion?: string;
  boardName?: string;
  serialNumber?: string;
}

// ============================================================================
// MIKROTIK MODEL DATABASE
// ============================================================================

export const mikrotikModels: MikrotikModel[] = [
  // hAP Series (Home Access Point)
  {
    id: 'hap-ac2',
    name: 'hAP ac²',
    series: 'hAP',
    manufacturer: 'MikroTik',
    releaseYear: 2018,
    architecture: 'arm',
    cpu: { cores: 4, frequency: 716, model: 'IPQ-4019' },
    ram: { size: 128, type: 'DDR2' },
    storage: { size: 16, type: 'nand' },
    ethernetPorts: [
      { id: 1, name: 'ether1', type: 'ethernet', speed: '10/100/1000', poeIn: true, poeStandard: '802.3af/at', comment: 'WAN/PoE In' },
      { id: 2, name: 'ether2', type: 'ethernet', speed: '10/100/1000', poeOut: true, maxPoeOutput: 12, comment: 'LAN' },
      { id: 3, name: 'ether3', type: 'ethernet', speed: '10/100/1000', poeOut: true, maxPoeOutput: 12, comment: 'LAN' },
      { id: 4, name: 'ether4', type: 'ethernet', speed: '10/100/1000', poeOut: true, maxPoeOutput: 12, comment: 'LAN' },
      { id: 5, name: 'ether5', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
    ],
    wireless: {
      enabled: true,
      standards: ['802.11n', '802.11ac'],
      chains: '2T2R',
      antennaGain: 5,
      frequencyBands: { '2.4GHz': true, '5GHz': true },
      maxTxPower: 23,
      ssidCount: 4,
      features: { muMimo: true, beamforming: true, mesh: true, apMode: true, stationMode: true, bridgeMode: true }
    },
    poe: { supported: true, type: 'both', inputVoltage: 24, outputVoltage: 24, maxOutputPower: 12, ports: [2, 3, 4], standard: '802.3af/at' },
    features: {
      hotspot: true, pppoe: true, vlan: true, qos: true, firewall: true,
      vpn: { pptp: true, l2tp: true, ipsec: true, openvpn: true, wireguard: true },
      routing: { static: true, rip: true, ospf: false, bgp: false },
      wireless: true, cloud: true, docker: false, switch: true, layer3: true
    },
    dimensions: { width: 135, height: 29, depth: 115 },
    powerConsumption: { min: 7, max: 23 },
    operatingTemp: { min: -40, max: 70 }
  },
  {
    id: 'hap-ac3',
    name: 'hAP ac³',
    series: 'hAP',
    manufacturer: 'MikroTik',
    releaseYear: 2021,
    architecture: 'arm',
    cpu: { cores: 4, frequency: 716, model: 'IPQ-4019' },
    ram: { size: 128, type: 'DDR2' },
    storage: { size: 128, type: 'nand' },
    ethernetPorts: [
      { id: 1, name: 'ether1', type: 'ethernet', speed: '10/100/1000', poeIn: true, poeStandard: '802.3af/at', comment: 'WAN/PoE In' },
      { id: 2, name: 'ether2', type: 'ethernet', speed: '10/100/1000', poeOut: true, maxPoeOutput: 12, comment: 'LAN' },
      { id: 3, name: 'ether3', type: 'ethernet', speed: '10/100/1000', poeOut: true, maxPoeOutput: 12, comment: 'LAN' },
      { id: 4, name: 'ether4', type: 'ethernet', speed: '10/100/1000', poeOut: true, maxPoeOutput: 12, comment: 'LAN' },
      { id: 5, name: 'ether5', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 6, name: 'SFP', type: 'sfp', speed: '10/100/1000', comment: 'Uplink' },
    ],
    wireless: {
      enabled: true,
      standards: ['802.11n', '802.11ac'],
      chains: '2T2R',
      antennaGain: 5,
      frequencyBands: { '2.4GHz': true, '5GHz': true },
      maxTxPower: 26,
      ssidCount: 4,
      features: { muMimo: true, beamforming: true, mesh: true, apMode: true, stationMode: true, bridgeMode: true }
    },
    poe: { supported: true, type: 'both', inputVoltage: 24, outputVoltage: 24, maxOutputPower: 12, ports: [2, 3, 4], standard: '802.3af/at' },
    features: {
      hotspot: true, pppoe: true, vlan: true, qos: true, firewall: true,
      vpn: { pptp: true, l2tp: true, ipsec: true, openvpn: true, wireguard: true },
      routing: { static: true, rip: true, ospf: false, bgp: false },
      wireless: true, cloud: true, docker: false, switch: true, layer3: true
    },
    dimensions: { width: 135, height: 29, depth: 115 },
    powerConsumption: { min: 9, max: 27 },
    operatingTemp: { min: -40, max: 70 }
  },
  {
    id: 'hap-ax2',
    name: 'hAP ax²',
    series: 'hAP',
    manufacturer: 'MikroTik',
    releaseYear: 2021,
    architecture: 'arm',
    cpu: { cores: 4, frequency: 864, model: 'IPQ-5018' },
    ram: { size: 128, type: 'DDR3' },
    storage: { size: 16, type: 'nand' },
    ethernetPorts: [
      { id: 1, name: 'ether1', type: 'ethernet', speed: '10/100/1000', comment: 'WAN' },
      { id: 2, name: 'ether2', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 3, name: 'ether3', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 4, name: 'ether4', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 5, name: 'ether5', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
    ],
    wireless: {
      enabled: true,
      standards: ['802.11n', '802.11ax'],
      chains: '2T2R',
      antennaGain: 5,
      frequencyBands: { '2.4GHz': true, '5GHz': true },
      maxTxPower: 23,
      ssidCount: 4,
      features: { muMimo: false, beamforming: true, mesh: true, apMode: true, stationMode: true, bridgeMode: true }
    },
    poe: { supported: false, type: 'none', standard: 'none' },
    features: {
      hotspot: true, pppoe: true, vlan: true, qos: true, firewall: true,
      vpn: { pptp: true, l2tp: true, ipsec: true, openvpn: true, wireguard: true },
      routing: { static: true, rip: true, ospf: false, bgp: false },
      wireless: true, cloud: true, docker: false, switch: true, layer3: true
    },
    dimensions: { width: 135, height: 29, depth: 115 },
    powerConsumption: { min: 6, max: 17 },
    operatingTemp: { min: -40, max: 70 }
  },
  {
    id: 'hap-ax3',
    name: 'hAP ax³',
    series: 'hAP',
    manufacturer: 'MikroTik',
    releaseYear: 2021,
    architecture: 'arm',
    cpu: { cores: 4, frequency: 864, model: 'IPQ-5018' },
    ram: { size: 256, type: 'DDR3' },
    storage: { size: 128, type: 'nand' },
    ethernetPorts: [
      { id: 1, name: 'ether1', type: 'ethernet', speed: '10/100/1000', poeIn: true, poeStandard: '802.3af/at', comment: 'WAN/PoE In' },
      { id: 2, name: 'ether2', type: 'ethernet', speed: '10/100/1000', poeOut: true, maxPoeOutput: 12, comment: 'LAN' },
      { id: 3, name: 'ether3', type: 'ethernet', speed: '10/100/1000', poeOut: true, maxPoeOutput: 12, comment: 'LAN' },
      { id: 4, name: 'ether4', type: 'ethernet', speed: '10/100/1000', poeOut: true, maxPoeOutput: 12, comment: 'LAN' },
      { id: 5, name: 'ether5', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 6, name: 'SFP', type: 'sfp', speed: '10/100/1000', comment: 'Uplink' },
    ],
    wireless: {
      enabled: true,
      standards: ['802.11n', '802.11ax'],
      chains: '4T4R',
      antennaGain: 7,
      frequencyBands: { '2.4GHz': true, '5GHz': true },
      maxTxPower: 29,
      ssidCount: 4,
      features: { muMimo: true, beamforming: true, mesh: true, apMode: true, stationMode: true, bridgeMode: true }
    },
    poe: { supported: true, type: 'both', inputVoltage: 24, outputVoltage: 24, maxOutputPower: 12, ports: [2, 3, 4], standard: '802.3af/at' },
    features: {
      hotspot: true, pppoe: true, vlan: true, qos: true, firewall: true,
      vpn: { pptp: true, l2tp: true, ipsec: true, openvpn: true, wireguard: true },
      routing: { static: true, rip: true, ospf: false, bgp: false },
      wireless: true, cloud: true, docker: false, switch: true, layer3: true
    },
    dimensions: { width: 135, height: 29, depth: 115 },
    powerConsumption: { min: 11, max: 35 },
    operatingTemp: { min: -40, max: 70 }
  },

  // cAP Series (Ceiling Access Point)
  {
    id: 'cap-ac',
    name: 'cAP ac',
    series: 'cAP',
    manufacturer: 'MikroTik',
    releaseYear: 2017,
    architecture: 'arm',
    cpu: { cores: 2, frequency: 775, model: 'QCA9558' },
    ram: { size: 128, type: 'DDR2' },
    storage: { size: 16, type: 'nand' },
    ethernetPorts: [
      { id: 1, name: 'ether1', type: 'ethernet', speed: '10/100/1000', poeIn: true, poeStandard: '802.3af/at', comment: 'PoE In' },
      { id: 2, name: 'ether2', type: 'ethernet', speed: '10/100/1000', poeOut: true, maxPoeOutput: 12, comment: 'PoE Out' },
    ],
    wireless: {
      enabled: true,
      standards: ['802.11n', '802.11ac'],
      chains: '2T2R',
      antennaGain: 4,
      frequencyBands: { '2.4GHz': true, '5GHz': true },
      maxTxPower: 23,
      ssidCount: 4,
      features: { muMimo: false, beamforming: true, mesh: true, apMode: true, stationMode: true, bridgeMode: true }
    },
    poe: { supported: true, type: 'both', inputVoltage: 24, outputVoltage: 24, maxOutputPower: 12, ports: [2], standard: '802.3af/at' },
    features: {
      hotspot: true, pppoe: true, vlan: true, qos: true, firewall: true,
      vpn: { pptp: true, l2tp: true, ipsec: true, openvpn: true, wireguard: true },
      routing: { static: true, rip: true, ospf: false, bgp: false },
      wireless: true, cloud: true, docker: false, switch: true, layer3: true
    },
    dimensions: { width: 135, height: 30, depth: 135 },
    powerConsumption: { min: 5, max: 14 },
    operatingTemp: { min: -40, max: 70 }
  },

  // RB Series (RouterBOARD)
  {
    id: 'rb4011',
    name: 'RB4011iGS+RM',
    series: 'RB',
    manufacturer: 'MikroTik',
    releaseYear: 2018,
    architecture: 'arm',
    cpu: { cores: 2, frequency: 1400, model: 'AL32400' },
    ram: { size: 1024, type: 'DDR3' },
    storage: { size: 512, type: 'nand' },
    ethernetPorts: [
      { id: 1, name: 'ether1', type: 'ethernet', speed: '10/100/1000', comment: 'WAN' },
      { id: 2, name: 'ether2', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 3, name: 'ether3', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 4, name: 'ether4', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 5, name: 'ether5', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 6, name: 'ether6', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 7, name: 'ether7', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 8, name: 'ether8', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 9, name: 'ether9', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 10, name: 'ether10', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 11, name: 'SFP+', type: 'sfp_plus', speed: '10G', comment: '10G Uplink' },
    ],
    wireless: undefined,
    poe: { supported: false, type: 'none', standard: 'none' },
    features: {
      hotspot: true, pppoe: true, vlan: true, qos: true, firewall: true,
      vpn: { pptp: true, l2tp: true, ipsec: true, openvpn: true, wireguard: true },
      routing: { static: true, rip: true, ospf: true, bgp: true },
      wireless: false, cloud: true, docker: false, switch: true, layer3: true
    },
    dimensions: { width: 440, height: 44, depth: 152 },
    powerConsumption: { min: 18, max: 38 },
    operatingTemp: { min: -40, max: 70 }
  },
  {
    id: 'rb750gr3',
    name: 'hEX (RB750Gr3)',
    series: 'RB',
    manufacturer: 'MikroTik',
    releaseYear: 2017,
    architecture: 'arm',
    cpu: { cores: 4, frequency: 880, model: 'IPQ-4019' },
    ram: { size: 128, type: 'DDR2' },
    storage: { size: 128, type: 'nand' },
    ethernetPorts: [
      { id: 1, name: 'ether1', type: 'ethernet', speed: '10/100/1000', comment: 'WAN' },
      { id: 2, name: 'ether2', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 3, name: 'ether3', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 4, name: 'ether4', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
      { id: 5, name: 'ether5', type: 'ethernet', speed: '10/100/1000', comment: 'LAN' },
    ],
    wireless: undefined,
    poe: { supported: false, type: 'none', standard: 'none' },
    features: {
      hotspot: true, pppoe: true, vlan: true, qos: true, firewall: true,
      vpn: { pptp: true, l2tp: true, ipsec: true, openvpn: true, wireguard: true },
      routing: { static: true, rip: true, ospf: false, bgp: false },
      wireless: false, cloud: true, docker: false, switch: true, layer3: true
    },
    dimensions: { width: 115, height: 29, depth: 92 },
    powerConsumption: { min: 5, max: 15 },
    operatingTemp: { min: -40, max: 70 }
  },

  // wAP Series (Wireless Access Point)
  {
    id: 'wap-ac',
    name: 'wAP ac',
    series: 'wAP',
    manufacturer: 'MikroTik',
    releaseYear: 2016,
    architecture: 'arm',
    cpu: { cores: 2, frequency: 775, model: 'QCA9558' },
    ram: { size: 128, type: 'DDR2' },
    storage: { size: 16, type: 'nand' },
    ethernetPorts: [
      { id: 1, name: 'ether1', type: 'ethernet', speed: '10/100/1000', poeIn: true, poeStandard: '802.3af/at', comment: 'PoE In' },
    ],
    wireless: {
      enabled: true,
      standards: ['802.11n', '802.11ac'],
      chains: '2T2R',
      antennaGain: 5,
      frequencyBands: { '2.4GHz': true, '5GHz': true },
      maxTxPower: 23,
      ssidCount: 4,
      features: { muMimo: false, beamforming: true, mesh: true, apMode: true, stationMode: true, bridgeMode: true }
    },
    poe: { supported: true, type: 'input', inputVoltage: 24, standard: '802.3af/at' },
    features: {
      hotspot: true, pppoe: true, vlan: true, qos: true, firewall: true,
      vpn: { pptp: true, l2tp: true, ipsec: true, openvpn: true, wireguard: true },
      routing: { static: true, rip: true, ospf: false, bgp: false },
      wireless: true, cloud: true, docker: false, switch: true, layer3: true
    },
    dimensions: { width: 130, height: 30, depth: 70 },
    powerConsumption: { min: 4, max: 11 },
    operatingTemp: { min: -40, max: 70 }
  },

  // mAP Series (Micro Access Point)
  {
    id: 'map-2nd',
    name: 'mAP',
    series: 'mAP',
    manufacturer: 'MikroTik',
    releaseYear: 2015,
    architecture: 'mipsbe',
    cpu: { cores: 1, frequency: 600, model: 'AR9344' },
    ram: { size: 64, type: 'DDR1' },
    storage: { size: 16, type: 'nand' },
    ethernetPorts: [
      { id: 1, name: 'ether1', type: 'ethernet', speed: '10/100', poeIn: true, poeStandard: 'passive', comment: 'PoE In' },
      { id: 2, name: 'ether2', type: 'ethernet', speed: '10/100', comment: 'LAN' },
    ],
    wireless: {
      enabled: true,
      standards: ['802.11b', '802.11g', '802.11n'],
      chains: '2T2R',
      antennaGain: 2,
      frequencyBands: { '2.4GHz': true },
      maxTxPower: 20,
      ssidCount: 4,
      features: { muMimo: false, beamforming: false, mesh: true, apMode: true, stationMode: true, bridgeMode: true }
    },
    poe: { supported: true, type: 'input', inputVoltage: 24, standard: 'passive' },
    features: {
      hotspot: true, pppoe: true, vlan: true, qos: true, firewall: true,
      vpn: { pptp: true, l2tp: true, ipsec: false, openvpn: false, wireguard: false },
      routing: { static: true, rip: true, ospf: false, bgp: false },
      wireless: true, cloud: true, docker: false, switch: true, layer3: true
    },
    dimensions: { width: 52, height: 15, depth: 39 },
    powerConsumption: { min: 2, max: 5 },
    operatingTemp: { min: -40, max: 70 }
  },

  // LHG Series
  {
    id: 'lhg-5ac',
    name: 'LHG 5 ac',
    series: 'LHG',
    manufacturer: 'MikroTik',
    releaseYear: 2017,
    architecture: 'mipsbe',
    cpu: { cores: 1, frequency: 720, model: 'QCA9558' },
    ram: { size: 128, type: 'DDR2' },
    storage: { size: 16, type: 'nand' },
    ethernetPorts: [
      { id: 1, name: 'ether1', type: 'ethernet', speed: '10/100/1000', poeIn: true, poeStandard: '802.3af/at', comment: 'PoE In' },
    ],
    wireless: {
      enabled: true,
      standards: ['802.11n', '802.11ac'],
      chains: '1T1R',
      antennaGain: 23,
      frequencyBands: { '5GHz': true },
      maxTxPower: 26,
      ssidCount: 4,
      features: { muMimo: false, beamforming: false, mesh: false, apMode: true, stationMode: true, bridgeMode: true }
    },
    poe: { supported: true, type: 'input', inputVoltage: 24, standard: '802.3af/at' },
    features: {
      hotspot: true, pppoe: true, vlan: true, qos: true, firewall: true,
      vpn: { pptp: true, l2tp: true, ipsec: true, openvpn: true, wireguard: true },
      routing: { static: true, rip: true, ospf: false, bgp: false },
      wireless: true, cloud: true, docker: false, switch: true, layer3: true
    },
    dimensions: { width: 310, height: 310, depth: 140 },
    powerConsumption: { min: 5, max: 12 },
    operatingTemp: { min: -40, max: 70 }
  },
];

// ============================================================================
// DEVICE DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect Mikrotik device model from board name or identity
 */
export function detectDeviceModel(boardName?: string, identity?: string): MikrotikModel | undefined {
  if (!boardName && !identity) {
    return undefined;
  }

  const searchStr = (boardName || identity || '').toLowerCase();

  // Try to match against known model IDs
  for (const model of mikrotikModels) {
    const modelId = model.id.toLowerCase();
    const modelName = model.name.toLowerCase();
    const series = model.series.toLowerCase();

    if (searchStr.includes(modelId) || searchStr.includes(modelName) || searchStr.includes(series)) {
      return model;
    }
  }

  // Try pattern matching for common board names
  const patterns: { [key: string]: string } = {
    'hap-ac2': /hap.*ac.*2/i,
    'hap-ac3': /hap.*ac.*3/i,
    'hap-ax2': /hap.*ax.*2/i,
    'hap-ax3': /hap.*ax.*3/i,
    'cap-ac': /cap.*ac/i,
    'rb4011': /rb.*4011/i,
    'rb750gr3': /rb.*750.*gr.*3/i,
    'wap-ac': /wap.*ac/i,
    'map-2nd': /map/i,
    'lhg-5ac': /lhg.*5.*ac/i,
  };

  for (const [modelId, pattern] of Object.entries(patterns)) {
    if (pattern.test(searchStr)) {
      return mikrotikModels.find(m => m.id === modelId);
    }
  }

  return undefined;
}

/**
 * Detect device from RouterOS system info
 */
export function detectFromRouterOS(systemInfo: {
  boardName?: string;
  identity?: string;
  version?: string;
  architecture?: string;
}): DeviceDetectionResult {
  const model = detectDeviceModel(systemInfo.boardName, systemInfo.identity);

  return {
    detected: !!model,
    model,
    confidence: model ? 0.9 : 0.5,
    identity: systemInfo.identity,
    routerOSVersion: systemInfo.version,
    boardName: systemInfo.boardName,
  };
}

/**
 * Get model by ID
 */
export function getModelById(modelId: string): MikrotikModel | undefined {
  return mikrotikModels.find(m => m.id === modelId);
}

/**
 * Get models by series
 */
export function getModelsBySeries(series: MikrotikSeries): MikrotikModel[] {
  return mikrotikModels.filter(m => m.series === series);
}

/**
 * Get models with wireless capability
 */
export function getWirelessModels(): MikrotikModel[] {
  return mikrotikModels.filter(m => m.wireless?.enabled);
}

/**
 * Get models with PoE output
 */
export function getPoeOutputModels(): MikrotikModel[] {
  return mikrotikModels.filter(m => m.poe.supported && m.poe.type === 'output' || m.poe.type === 'both');
}

// ============================================================================
// PORT LAYOUT GENERATION
// ============================================================================

/**
 * Generate visual port layout for a device
 */
export function generatePortLayout(model: MikrotikModel): PortLayout {
  const ethernetPorts = model.ethernetPorts.filter(p => p.type === 'ethernet');
  const sfpPorts = model.ethernetPorts.filter(p => p.type === 'sfp' || p.type === 'sfp_plus');

  return {
    model: model.id,
    modelName: model.name,
    ethernet: ethernetPorts.map(p => ({
      id: p.id,
      name: p.name,
      speed: p.speed,
      poeIn: p.poeIn || false,
      poeOut: p.poeOut || false,
      label: p.comment || p.name
    })),
    sfp: sfpPorts.map(p => ({
      id: p.id,
      name: p.name,
      speed: p.speed,
      type: p.type,
      label: p.comment || p.name
    })),
    wireless: model.wireless ? {
      enabled: true,
      bands: Object.entries(model.wireless.frequencyBands)
        .filter(([_, enabled]) => enabled)
        .map(([band, _]) => band),
      antennas: model.wireless.chains
    } : undefined,
    poe: model.poe.supported ? {
      type: model.poe.type,
      ports: model.poe.ports || [],
      maxPower: model.poe.maxOutputPower || 0
    } : undefined
  };
}

export interface PortLayout {
  model: string;
  modelName: string;
  ethernet: {
    id: number;
    name: string;
    speed: string;
    poeIn: boolean;
    poeOut: boolean;
    label: string;
  }[];
  sfp: {
    id: number;
    name: string;
    speed: string;
    type: string;
    label: string;
  }[];
  wireless?: {
    enabled: boolean;
    bands: string[];
    antennas: string;
  };
  poe?: {
    type: string;
    ports: number[];
    maxPower: number;
  };
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  mikrotikModels,
  detectDeviceModel,
  detectFromRouterOS,
  getModelById,
  getModelsBySeries,
  getWirelessModels,
  getPoeOutputModels,
  generatePortLayout
};
