# Endpoint catalog

Generated from `src/data/endpoints.json`. Run `npm run docs:generate`; do not edit generated files.

**Scope:** observed firmware UI/shared-script references, not all possible server handlers. Read/write verification is installation- and firmware-specific. No assumption is made that disabled UI controls imply server authorization.

- 58 HTTP handlers; 29 menu contexts.
- 128 method/action definitions.
- 48 handlers with verified reads.
- 27 advertised SOAP actions.

Every HTTP handler uses `/?_type=TYPE&_tag=HANDLER`. Additional parameters are listed per binding. Firmware spelling `DeveiceType` is intentional.

## `accessdev_data`

- Dispatch: `_type=hiddenData`
- Page contexts: `dmz`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

Operation parameters: `DeveiceType`: ETH | WLAN | ALL (firmware spelling).

Observed response field names: `_LuQUID_HostName`, `_LuQUID_IPAddress`, `_LuQUID_MACAddress`.

## `quick_sess`

- Dispatch: `_type=hiddenData`
- Page contexts: shared session context; review protocol
- Read verified: **not established**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| POST | — | session_state_change | source-derived / untested |

Operation parameters: `IF_quickData`: 1 enters quick setup; 0 exits; session/UI state only.

## `sntp_data`

- Dispatch: `_type=hiddenData`
- Page contexts: `sntp`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

Observed response field names: `AutoSetTzname`, `CurrentLocalTime`, `DaylightSavingsUsed`, `Dscp`, `Enable`, `NtpConfigPermission`, `NtpServer1`, `NtpServer2`, `NtpServer3`, `NtpServer4`, `NtpServer5`, `PollTimeInterval`, `SntpBindWanName`, `ZoneIndex`, `_InstID`.

## `switchlang_entry`

- Dispatch: `_type=hiddenData`
- Page contexts: shared session context; review protocol
- Read verified: **not established**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| POST | — | ui_preference_write | source-derived / untested |

Operation parameters: `IF_LanguageSwitch`: English | Portuguese.

## `login_entry`

- Dispatch: `_type=loginData`
- Page contexts: shared session context; review protocol
- Read verified: **not established**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | authentication_state_read | observed working |
| POST | — | login | observed working |

Operation parameters: `action`: login; `Username`: credential; `Password`: sha256(password + challenge); `_sessionTOKEN`: sess_token from login_entry GET.

## `login_token`

- Dispatch: `_type=loginData`
- Page contexts: shared session context; review protocol
- Read verified: **not established**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | authentication_challenge | observed working |

## `logout_entry`

- Dispatch: `_type=loginData`
- Page contexts: shared session context; review protocol
- Read verified: **not established**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| POST | — | logout | observed working |

Operation parameters: `IF_LogOff`: 1.

## `modeswitch_entry`

- Dispatch: `_type=loginData`
- Page contexts: shared session context; review protocol
- Read verified: **not established**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| POST | — | ui_preference_write | source-derived / untested |

Operation parameters: `IF_ModeSwitch`: Basic | Advanced.

## `Localnet_LanDevDHCPSource_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `lanMgrIpv4`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### LanDevDHCPSource

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `ProcFlag` | radio | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

Observed response field names: `ProcFlag`, `VendorClassID`, `_InstID`.

## `Localnet_LanMgrIpv4_DHCPBasicCfg_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `lanMgrIpv4`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | observed working |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

Verification scope: DHCP start-address update only.

### DHCPBasicCfg

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `IF_URL_HOST` | hidden | no | unknown until response encode metadata is processed |
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `IPAddr` | hidden | no | unknown until response encode metadata is processed |
| `SubMask` | hidden | no | unknown until response encode metadata is processed |
| `OptEnable` | hidden | no | unknown until response encode metadata is processed |
| `OptCode` | hidden | no | unknown until response encode metadata is processed |
| `SubnetMask` | hidden | no | unknown until response encode metadata is processed |
| `MinAddress` | hidden | no | unknown until response encode metadata is processed |
| `MaxAddress` | hidden | no | unknown until response encode metadata is processed |
| `IPRouters` | hidden | no | unknown until response encode metadata is processed |
| `DNSServer1` | hidden | no | unknown until response encode metadata is processed |
| `DNSServer2` | hidden | no | unknown until response encode metadata is processed |
| `LeaseTime` | hidden | no | unknown until response encode metadata is processed |
| `ServerEnable` | radio | no | unknown until response encode metadata is processed |
| `DnsServerSource` | radio | no | unknown until response encode metadata is processed |
| `OptValue` | text | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

Observed response field names: `DNSServer1`, `DNSServer2`, `DnsServerSource`, `IPAddr`, `IPv4AssignLANIP`, `IPv6AssignLANIP`, `Ipv4DnsOrigin`, `Ipv6DnsOrigin`, `LeaseTime`, `MaxAddress`, `MinAddress`, `OptCode`, `OptEnable`, `OptValue`, `ServerEnable`, `SubMask`, `SubnetMask`, `_InstID`.

## `Localnet_LanMgrIpv4_DHCPHostInfo_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `lanMgrIpv4`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### DHCPHostInfo

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

Observed response field names: `ExpiredTime`, `HostName`, `IPAddr`, `MACAddr`, `PhyPortName`, `_InstID`.

## `Localnet_LanMgrIpv4_DHCPStaticRule_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `lanMgrIpv4`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Delete` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

Client UI exposes add-instance support; new entries use `_InstID=-1`. Create/delete remain untested.

### DHCPStaticRule

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `MACAddr` | hidden | no | unknown until response encode metadata is processed |
| `IPAddr` | hidden | no | unknown until response encode metadata is processed |
| `Name` | text | no | unknown until response encode metadata is processed |
| `DHCPStaticRule_Refresh_button` | hidden | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

## `Localnet_ftp_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `ftp`
- Read verified: **yes**
- Response encryption metadata: `Password`

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### LocalFtp

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `FtpEnable` | radio | no | not marked by captured encode metadata; re-evaluate on each response |
| `FtpAnon` | radio | no | not marked by captured encode metadata; re-evaluate on each response |
| `Username` | text | no | not marked by captured encode metadata; re-evaluate on each response |
| `Password` | password | yes | required; static attribute or observed response encode metadata |

Observed response field names: `FtpAnon`, `FtpEnable`, `Username`, `_InstID`.

## `Samba_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `samba`
- Read verified: **yes**
- Response encryption metadata: `PassWord`

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### Samba

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `EnableSmb` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `AutoRun` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `SambaSwitch` | radio | no | not marked by captured encode metadata; re-evaluate on each response |
| `NetbiosName` | text | no | not marked by captured encode metadata; re-evaluate on each response |
| `AuthType` | radio | no | not marked by captured encode metadata; re-evaluate on each response |
| `UserEnable` | radio | no | not marked by captured encode metadata; re-evaluate on each response |
| `UserName` | text | no | not marked by captured encode metadata; re-evaluate on each response |
| `PassWord` | password | yes | required; static attribute or observed response encode metadata |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

Observed response field names: `AuthType`, `AutoRun`, `EnableSmb`, `NetbiosName`, `UserEnable`, `UserName`, `UserRight`, `_InstID`.

## `accessdev_homepage_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `homePage`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

Operation parameters: `InstNum`: optional UI list limit, observed 5.

Observed response field names: `AliasName`, `HostName`, `IPAddress`, `IPV6Address`, `MACAddress`.

## `accessdev_landevs_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `localNetStatus`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### LANDevs

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `InPkts` | hidden | no | unknown until response encode metadata is processed |
| `OutPkts` | hidden | no | unknown until response encode metadata is processed |
| `InBytes` | hidden | no | unknown until response encode metadata is processed |
| `OutBytes` | hidden | no | unknown until response encode metadata is processed |

Observed response field names: `AliasName`, `HostName`, `IPAddress`, `IPV6Address`, `MACAddress`.

## `db_resetmgr_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `rebootAndReset`
- Read verified: **not established**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | source-derived / untested |
| POST | `IF_ACTION=Reset` | factory_reset | source-derived / untested |

### ResetManag

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `Msg` | hidden | no | unknown until response encode metadata is processed |

## `ddns_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `ddns`
- Read verified: **yes**
- Response encryption metadata: `Password`

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### Ddns

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `Service` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `serviceInst` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `Name` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `Server` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `Interface` | select | no | not marked by captured encode metadata; re-evaluate on each response |
| `Enable` | radio | no | not marked by captured encode metadata; re-evaluate on each response |
| `serviceUrl` | text | no | not marked by captured encode metadata; re-evaluate on each response |
| `Username` | text | no | not marked by captured encode metadata; re-evaluate on each response |
| `Password` | password | yes | required; static attribute or observed response encode metadata |
| `DomainName` | text | no | not marked by captured encode metadata; re-evaluate on each response |
| `phddns_Username` | text | no | not marked by captured encode metadata; re-evaluate on each response |
| `phddns_Password` | password | yes | not marked by captured encode metadata; re-evaluate on each response |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

Observed response field names: `DomainName`, `Enable`, `Interface`, `Service`, `Status`, `UserType`, `Username`, `_InstID`.

## `devauth_accountmgr_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `accountMgr`
- Read verified: **yes**
- Response encryption metadata: `NewPassword`, `Password`

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### AccountManag

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `Right` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `Enable` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `Username` | text | no | not marked by captured encode metadata; re-evaluate on each response |
| `Password` | password | yes | required; static attribute or observed response encode metadata |
| `NewPassword` | password | yes | required; static attribute or observed response encode metadata |
| `Keyword` | text | yes | not marked by captured encode metadata; re-evaluate on each response |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

Observed response field names: `Enable`, `Keyword`, `Right`, `Username`, `_InstID`.

## `devmgr_restartmgr_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `rebootAndReset`
- Read verified: **not established**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | source-derived / untested |
| POST | `IF_ACTION=Restart` | reboot | source-derived / untested |

### RestartManag

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `Msg` | hidden | no | unknown until response encode metadata is processed |

## `devmgr_statusmgr_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `statusMgr`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### ManagStatus

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|

Observed response field names: `BootVer`, `CpuUsage1`, `CpuUsage2`, `CpuUsage3`, `CpuUsage4`, `HardwareVer`, `ManuFacturer`, `ManuFacturerOui`, `MemUsage`, `ModelName`, `OnuAlias`, `PowerOnTime`, `SerialNumber`, `SoftwareVer`, `SoftwareVerExtent`, `VerDate`, `_InstID`.

## `dms_dms_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `dms`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### DMS

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `ContentList` | hidden | no | unknown until response encode metadata is processed |
| `Enable` | radio | no | unknown until response encode metadata is processed |
| `DmsName` | text | no | unknown until response encode metadata is processed |
| `RescanTime` | select | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `PostDataChangeByCustom`.

Observed response field names: `ContentList`, `DmsName`, `Enable`, `PathRoot`, `RescanTime`, `_InstID`.

## `dms_querydir_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: shared session context; review protocol
- Read verified: **not established**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | filesystem_read | source-derived / untested |

Operation parameters: `querydir`: USB directory path.

## `dns_localdns_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `dns`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### LocalDnsServer

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `SerIPAddress1` | hidden | no | unknown until response encode metadata is processed |
| `SerIPAddress2` | hidden | no | unknown until response encode metadata is processed |
| `SerIPv6Address1` | text | no | unknown until response encode metadata is processed |
| `SerIPv6Address2` | text | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `PostDataChangeByCustom`.

Observed response field names: `DomainName`, `SerIPAddress1`, `SerIPAddress2`, `SerIPv6Address1`, `SerIPv6Address2`, `_InstID`.

## `firewall_config_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `firewall`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### FirewallConf

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `Enable` | checkbox | no | unknown until response encode metadata is processed |
| `Level` | radio | no | unknown until response encode metadata is processed |

Observed response field names: `Enable`, `Level`, `_InstID`.

## `firewall_dmz_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `dmz`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### Ipv4Dmz

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `Enable` | radio | no | unknown until response encode metadata is processed |
| `WANCViewName` | select | no | unknown until response encode metadata is processed |
| `InternalClient` | text | no | unknown until response encode metadata is processed |

Observed response field names: `Enable`, `InternalClient`, `WANCViewName`, `_InstID`.

## `firewall_dos_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `firewall`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### FirewallDos

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `Enable` | checkbox | no | unknown until response encode metadata is processed |
| `Threshold` | text | no | unknown until response encode metadata is processed |

Observed response field names: `Enable`, `Threshold`, `_InstID`.

## `firewall_filterglobal_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `filterCriteria`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### SecurityGlobalCtl

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `MacFilterEnable` | radio | no | unknown until response encode metadata is processed |
| `MacFilterTarget` | select | no | unknown until response encode metadata is processed |
| `UrlFilterEnable` | radio | no | unknown until response encode metadata is processed |
| `UrlFilterTarget` | select | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `PostDataChangeByCustom`, `hiddenValueChangeByCustom`.

Observed response field names: `MacFilterEnable`, `MacFilterTarget`, `UrlFilterEnable`, `UrlFilterTarget`, `_InstID`.

## `firewall_homepage_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `homePage`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

Observed response field names: `AntiAttack`, `Level`, `_InstID`.

## `firewall_ipfilter_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `filterCriteria`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Delete` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

Client UI exposes add-instance support; new entries use `_InstID=-1`. Create/delete remain untested.

### IPFilter

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `Enable` | radio | no | unknown until response encode metadata is processed |
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `Name` | text | no | unknown until response encode metadata is processed |
| `FilterTarget` | radio | no | unknown until response encode metadata is processed |
| `FilterIndex` | select | no | unknown until response encode metadata is processed |
| `IPVersion` | select | no | unknown until response encode metadata is processed |
| `SourceIPMask` | hidden | no | unknown until response encode metadata is processed |
| `DestIPMask` | hidden | no | unknown until response encode metadata is processed |
| `SourceIP` | text | no | unknown until response encode metadata is processed |
| `SMask` | text | no | unknown until response encode metadata is processed |
| `DestIP` | text | no | unknown until response encode metadata is processed |
| `DMask` | text | no | unknown until response encode metadata is processed |
| `Protocol` | hidden | no | unknown until response encode metadata is processed |
| `hiddenProtocol` | select | no | unknown until response encode metadata is processed |
| `inputProtocol` | text | no | unknown until response encode metadata is processed |
| `MinSrcPort` | text | no | unknown until response encode metadata is processed |
| `MaxSrcPort` | text | no | unknown until response encode metadata is processed |
| `MinDstPort` | text | no | unknown until response encode metadata is processed |
| `MaxDstPort` | text | no | unknown until response encode metadata is processed |
| `INCViewName` | select | no | unknown until response encode metadata is processed |
| `OUTCViewName` | select | no | unknown until response encode metadata is processed |
| `DSCP` | text | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `PostDataChangeByCustom`, `hiddenValueChangeByCustom`.

## `firewall_portforwarding_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `portForwarding`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Delete` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

Client UI exposes add-instance support; new entries use `_InstID=-1`. Create/delete remain untested.

### PortForwarding

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `Enable` | radio | no | unknown until response encode metadata is processed |
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `RemoteHost` | hidden | no | unknown until response encode metadata is processed |
| `RemoteHostEndRange` | hidden | no | unknown until response encode metadata is processed |
| `AllInterface` | hidden | no | unknown until response encode metadata is processed |
| `Interface` | hidden | no | unknown until response encode metadata is processed |
| `Alias` | text | no | unknown until response encode metadata is processed |
| `Description` | text | no | unknown until response encode metadata is processed |
| `Protocol` | select | no | unknown until response encode metadata is processed |
| `InternalClient` | text | no | unknown until response encode metadata is processed |
| `ExternalPort` | text | no | unknown until response encode metadata is processed |
| `ExternalPortEndRange` | text | no | unknown until response encode metadata is processed |
| `InternalPort` | text | no | unknown until response encode metadata is processed |
| `InternalPortEndRange` | text | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

Observed response field names: `Alias`, `AllInterface`, `Description`, `Enable`, `ExternalPort`, `ExternalPortEndRange`, `Interface`, `InternalClient`, `InternalPort`, `InternalPortEndRange`, `Protocol`, `RemoteHost`, `RemoteHostEndRange`, `_InstID`.

## `l2tp_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `l2tpStatus`
- Read verified: **yes**
- Response encryption metadata: `Password`

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### L2tpStatus

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |

Observed response field names: `AuthType`, `ConnSatus`, `DNS1`, `DNS2`, `DNS3`, `Enable`, `GateWay`, `IPAddress`, `IpMode`, `L2tpServer1`, `LowIFID`, `NATEnable`, `SessionName`, `SubnetMask`, `UpTime`, `UserName`, `_InstID`.

## `sntp_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `sntp`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### LocalSntp

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `ZoneIndex` | hidden | no | unknown until response encode metadata is processed |
| `AutoSetTzname` | hidden | no | unknown until response encode metadata is processed |
| `LocalTimeZoneandName` | select | no | unknown until response encode metadata is processed |
| `NtpServer1` | text | no | unknown until response encode metadata is processed |
| `NtpServer2` | text | no | unknown until response encode metadata is processed |
| `NtpServer3` | text | no | unknown until response encode metadata is processed |
| `NtpServer4` | text | no | unknown until response encode metadata is processed |
| `NtpServer5` | text | no | unknown until response encode metadata is processed |
| `PollTimeInterval` | text | no | unknown until response encode metadata is processed |
| `DaylightSavingsUsed` | radio | no | unknown until response encode metadata is processed |
| `Dscp` | text | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `PostDataChangeByCustom`, `hiddenValueChangeByCustom`.

Observed response field names: `AutoSetTzname`, `CurrentLocalTime`, `DaylightSavingsUsed`, `Dscp`, `Enable`, `NtpConfigPermission`, `NtpServer1`, `NtpServer2`, `NtpServer3`, `NtpServer4`, `NtpServer5`, `PollTimeInterval`, `SntpBindWanName`, `ZoneIndex`, `_InstID`.

## `status_lan_info_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `localNetStatus`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=LAN_CLEAR` | counter_reset | source-derived / untested |

### lan_info

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|

Observed response field names: `Duplex`, `InBytes`, `InDiscard`, `InError`, `InMulticast`, `InPkts`, `InUnicast`, `OutBytes`, `OutDiscard`, `OutError`, `OutMulticast`, `OutPkts`, `OutUnicast`, `Speed`, `Status`, `_InstID`.

## `topo_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `mmTopology`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `query:Action=SET_ALIAS` | configuration_write | source-derived / untested |

Operation parameters: `InstIdentity`: MAC/instance identity from topology; `Alias`: display name.

### AccessDevDisplay

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |

## `tunnel_4in6_status_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `tunnel4in6Status`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### Tnl4in6Status

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|

## `upnp_portmap_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `upnpportmapss`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### PortMap

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |

Observed response field names: `Description`, `ExternalPort`, `InternalClient`, `InternalPort`, `Protocol`, `ServerIPAddress`, `_InstID`.

## `upnp_upnp_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `upnp`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### LocalUPnP

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `EnableUPnPIGD` | radio | no | unknown until response encode metadata is processed |
| `ADPeriod` | text | no | unknown until response encode metadata is processed |
| `TTL` | text | no | unknown until response encode metadata is processed |

Observed response field names: `ADPeriod`, `EnableAction`, `EnableUPnPIGD`, `TTL`, `_InstID`.

## `usb_homepage_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `homePage`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=EjectDev` | device_state_change | source-derived / untested |

Operation parameters: `EjectId`: UI example /mnt/usb1_1; select actual device, never assume path.

Observed response field names: `FtpEnable`, `IPAddr`, `ServerPort`, `USBIfNum`, `_InstID`.

## `usb_usbdevs_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `localNetStatus`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### USBDevs

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|

## `usb_usbfunccfg_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `usbfunccfg`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### LocalUSBFuncCfg

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `PrinterEnable` | radio | no | unknown until response encode metadata is processed |

Observed response field names: `PrinterEnable`, `_InstID`.

## `voipRegStatus_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `voipStatus`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### VOIPRegStatus

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|

Observed response field names: `AuthUserName`, `AuthUserName3`, `DirectoryNumber`, `RegStatus`, `VoIPRegStatus`, `_InstID`.

## `voipVpPhyinterface_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `voipStatus`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### VOIPPhoneStatus

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|

Observed response field names: `LanPortStatus`, `_InstID`.

## `voip_homepage_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `homePage`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

Observed response field names: `AuthUserName`, `IsOnline`, `LanPortStatus`, `VoIPRegStatus`, `_InstID`.

## `wan_3g_status_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `Wan3gStatus`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### WAN3GStatus

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `TtyPDPType` | hidden | no | unknown until response encode metadata is processed |
| `IsNAT` | hidden | no | unknown until response encode metadata is processed |
| `ConnStatus` | hidden | no | unknown until response encode metadata is processed |
| `ConnError` | hidden | no | unknown until response encode metadata is processed |
| `DNS1` | hidden | no | unknown until response encode metadata is processed |
| `DNS2` | hidden | no | unknown until response encode metadata is processed |
| `DNS3` | hidden | no | unknown until response encode metadata is processed |
| `IPAddress` | hidden | no | unknown until response encode metadata is processed |
| `SubnetMask` | hidden | no | unknown until response encode metadata is processed |

## `wan_internetstatus_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `ethWanStatus`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=DHCPRENEW` | connectivity_disrupting | source-derived / untested |
| POST | `IF_ACTION=DHCPRELEASE` | connectivity_disrupting | source-derived / untested |
| POST | `IF_ACTION=PPPCONNECT` | connectivity_disrupting | source-derived / untested |
| POST | `IF_ACTION=PPPDISCONNECT` | connectivity_disrupting | source-derived / untested |
| POST | `IF_ACTION=PPPCTCCONNECT` | connectivity_disrupting | source-derived / untested |
| POST | `IF_ACTION=PPPCTCDISCONNECT` | connectivity_disrupting | source-derived / untested |
| POST | `IF_ACTION=PPPVIETCONNECT` | connectivity_disrupting | source-derived / untested |
| POST | `IF_ACTION=PPPVIETDISCONNECT` | connectivity_disrupting | source-derived / untested |

### EthStateDev

Additional query: `TypeUplink=2&pageType=1`.

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `IF_UPLINK` | hidden | no | unknown until response encode metadata is processed |
| `xDslMode` | hidden | no | unknown until response encode metadata is processed |
| `Status` | hidden | no | unknown until response encode metadata is processed |
| `linkMode` | hidden | no | unknown until response encode metadata is processed |
| `TransType` | hidden | no | unknown until response encode metadata is processed |
| `IpMode` | hidden | no | unknown until response encode metadata is processed |
| `mode` | hidden | no | unknown until response encode metadata is processed |
| `IsNAT` | hidden | no | unknown until response encode metadata is processed |
| `IPAddress` | hidden | no | unknown until response encode metadata is processed |
| `SubnetMask` | hidden | no | unknown until response encode metadata is processed |
| `ConnStatus` | hidden | no | unknown until response encode metadata is processed |
| `UpTime` | hidden | no | unknown until response encode metadata is processed |
| `LLA` | hidden | no | unknown until response encode metadata is processed |
| `GuaNum` | hidden | no | unknown until response encode metadata is processed |
| `Gua1` | hidden | no | unknown until response encode metadata is processed |
| `Gua2` | hidden | no | unknown until response encode metadata is processed |
| `Gua3` | hidden | no | unknown until response encode metadata is processed |
| `Dns1v6` | hidden | no | unknown until response encode metadata is processed |
| `Dns2v6` | hidden | no | unknown until response encode metadata is processed |
| `Dns3v6` | hidden | no | unknown until response encode metadata is processed |
| `UpTimeV6` | hidden | no | unknown until response encode metadata is processed |
| `WorkIFMac` | hidden | no | unknown until response encode metadata is processed |
| `ConnStatus6` | hidden | no | unknown until response encode metadata is processed |
| `GateWay` | hidden | no | unknown until response encode metadata is processed |
| `ConnError` | hidden | no | unknown until response encode metadata is processed |
| `Gateway6` | hidden | no | unknown until response encode metadata is processed |
| `RemoteLLA` | hidden | no | unknown until response encode metadata is processed |
| `RemainLeaseTime` | hidden | no | unknown until response encode metadata is processed |
| `Addressingtype` | hidden | no | unknown until response encode metadata is processed |
| `DNS1` | hidden | no | unknown until response encode metadata is processed |
| `DNS2` | hidden | no | unknown until response encode metadata is processed |
| `DNS3` | hidden | no | unknown until response encode metadata is processed |
| `DestAddress` | hidden | no | unknown until response encode metadata is processed |
| `IsAuto` | hidden | no | unknown until response encode metadata is processed |
| `GuaSrc` | hidden | no | unknown until response encode metadata is processed |
| `Gateway6Src` | hidden | no | unknown until response encode metadata is processed |
| `DnsSrc` | hidden | no | unknown until response encode metadata is processed |
| `IsPD` | hidden | no | unknown until response encode metadata is processed |
| `ConnTrigger` | hidden | no | unknown until response encode metadata is processed |
| `LLAStatus` | hidden | no | unknown until response encode metadata is processed |
| `StrServList` | hidden | no | unknown until response encode metadata is processed |
| `VLANID` | hidden | no | unknown until response encode metadata is processed |
| `Pd` | hidden | no | unknown until response encode metadata is processed |
| `PdLen` | hidden | no | unknown until response encode metadata is processed |
| `RxPackets` | hidden | no | unknown until response encode metadata is processed |
| `TxPackets` | hidden | no | unknown until response encode metadata is processed |
| `RxBytes` | hidden | no | unknown until response encode metadata is processed |
| `TxBytes` | hidden | no | unknown until response encode metadata is processed |
| `TxErrors` | hidden | no | unknown until response encode metadata is processed |
| `RxErrors` | hidden | no | unknown until response encode metadata is processed |
| `TxUnicast` | hidden | no | unknown until response encode metadata is processed |
| `RxUnicast` | hidden | no | unknown until response encode metadata is processed |
| `TxDropped` | hidden | no | unknown until response encode metadata is processed |
| `RxDropped` | hidden | no | unknown until response encode metadata is processed |
| `TxMulticast` | hidden | no | unknown until response encode metadata is processed |
| `RxMulticast` | hidden | no | unknown until response encode metadata is processed |
| `TxBroadcast` | hidden | no | unknown until response encode metadata is processed |
| `RxBroadcast` | hidden | no | unknown until response encode metadata is processed |
| `IsSLAAC` | hidden | no | unknown until response encode metadata is processed |
| `IsGUA` | hidden | no | unknown until response encode metadata is processed |
| `IsPdAddr` | hidden | no | unknown until response encode metadata is processed |
| `DHCPServer` | hidden | no | unknown until response encode metadata is processed |
| `PortRange` | hidden | no | unknown until response encode metadata is processed |
| `LocalIPv6Addr` | hidden | no | unknown until response encode metadata is processed |
| `LocalIPv4Addr` | hidden | no | unknown until response encode metadata is processed |
| `LowIFID` | hidden | no | unknown until response encode metadata is processed |
| `MAPEStatus` | hidden | no | unknown until response encode metadata is processed |

Observed response field names: `AuthType`, `ConnError`, `ConnStatus`, `ConnStatus6`, `ConnTrigger`, `DNS1`, `DNS2`, `DNS3`, `DSCP`, `Dns1v6`, `Dns2v6`, `Dns3v6`, `Enable`, `EnablePassThrough`, `GateWay`, `Gateway6`, `Gua1`, `Gua1PrefixLen`, `Gua2`, `Gua2PrefixLen`, `Gua3`, `Gua3PrefixLen`, `GuaNum`, `IPAddress`, `IPv6AcquireMode`, `IpMode`, `IsDefGW`, `IsGUA`, `IsNAT`, `IsPD`, `IsPdAddr`, `IsSLAAC`, `LLA`, `MTU`, `MaxMRU`, `PPPoeServiceName`, `Password`, `Pd`, `PdLen`, `Priority`, `RemoteLLA`, `ServList`, `StrServList`, `SubnetMask`, `TransType`, `Unnumbered`, `UpTime`, `UpTimeV6`, `UserName`, `VLANID`, `VlanEnable`, `WANCName`, `WorkIFMac`, `_InstID`, `linkMode`, `mode`, `pageType`, `uplink`, `wantype`, `xdslMode`.

## `web_login_timeout_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `accountMgr`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### LoginTimeout

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `Timeout` | text | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

## `wlan_client_stat_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `localNetStatus`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### Wlan_ClientStat

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `RXPackets` | hidden | no | unknown until response encode metadata is processed |
| `TXPackets` | hidden | no | unknown until response encode metadata is processed |
| `RXBytes` | hidden | no | unknown until response encode metadata is processed |
| `TXBytes` | hidden | no | unknown until response encode metadata is processed |

Observed response field names: `Alias`, `AliasName`, `BAND`, `ConnectTime`, `CurrentMode`, `ESSID`, `HostName`, `IPAddress`, `IPV6Address`, `LinkTime`, `MACAddress`, `MCS`, `NOISE`, `RSSI`, `RXBytes`, `RXPackets`, `RxRate`, `SNR`, `TXBytes`, `TXPackets`, `TxRate`, `_InstID`.

## `wlan_homepage_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `homePage`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

Operation parameters: `InstNum`: optional UI list limit, observed 5.

Observed response field names: `HostName`, `IPAddress`, `IPV6Address`, `MACAddress`, `RadioSwitch`.

## `wlan_macfilteraclpolicy_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `wlanAdvanced`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### MACFilterACLPolicy

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `ACLPolicy` | radio | no | unknown until response encode metadata is processed |

Observed response field names: `ACLPolicy`, `Alias`, `Band`, `RadioStatus`, `WLANViewName`, `_InstID`.

## `wlan_macfilterrule_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `wlanAdvanced`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Delete` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

Client UI exposes add-instance support; new entries use `_InstID=-1`. Create/delete remain untested.

### MACFilterRule

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `MACAddress` | hidden | no | unknown until response encode metadata is processed |
| `Name` | text | no | unknown until response encode metadata is processed |
| `Interface` | select | no | unknown until response encode metadata is processed |

## `wlan_sta_wlan_profile_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `wlanStaScanAP`
- Read verified: **not established**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | `query:APGetFrom=ScanAP` | active_radio_scan | source-derived / untested |
| GET | `query:APGetFrom=ScanAP5g` | active_radio_scan | source-derived / untested |

Operation parameters: `_sessionTOKEN`: fresh page token.

Operation parameters: `_sessionTOKEN`: fresh page token.

### WLANScanAP

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|

### WLANScanAP5g

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `DataHasBeenGot5g` | hidden | no | unknown until response encode metadata is processed |

## `wlan_wlanbasicadconf_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `wlanBasic`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | observed working |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

Verification scope: 2.4 GHz mixed-mode update only; SSID/security and other radio settings preserved.

### WlanBasicAdConf

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `BasicDataRates` | hidden | no | unknown until response encode metadata is processed |
| `OpDataRates` | hidden | no | unknown until response encode metadata is processed |
| `11nMode` | hidden | no | unknown until response encode metadata is processed |
| `GreenField` | hidden | no | unknown until response encode metadata is processed |
| `AutoChannelEnabled` | hidden | no | unknown until response encode metadata is processed |
| `Band` | hidden | no | unknown until response encode metadata is processed |
| `Channel` | hidden | no | unknown until response encode metadata is processed |
| `SideBand` | hidden | no | unknown until response encode metadata is processed |
| `Standard` | hidden | no | unknown until response encode metadata is processed |
| `BandWidth` | hidden | no | unknown until response encode metadata is processed |
| `AutoChRange` | hidden | no | unknown until response encode metadata is processed |
| `PreambleType` | select | no | unknown until response encode metadata is processed |
| `WlanBasicAdConf_Refresh_button` | hidden | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

Observed response field names: `11nMode`, `AutoChannelEnabled`, `Band`, `BandWidth`, `BasicDataRates`, `CardMode`, `Channel`, `ChannelList`, `CountryCode`, `DownLinkMUMIMO`, `GreenField`, `MUMIMOEnable`, `OpDataRates`, `PreambleType`, `RadioStatus`, `Standard`, `UPLinkMUMIMO`, `_InstID`.

## `wlan_wlanbasiconoff_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `wlanBasic`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### WlanBasicAdOnOff

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `RadioStatus` | hidden | no | unknown until response encode metadata is processed |
| `TimerEnable` | radio | no | unknown until response encode metadata is processed |
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `Band` | hidden | no | unknown until response encode metadata is processed |
| `TimeStartHour` | select | no | unknown until response encode metadata is processed |
| `TimeStartMin` | select | no | unknown until response encode metadata is processed |
| `TimeEndHour` | select | no | unknown until response encode metadata is processed |
| `TimeEndMin` | select | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

Observed response field names: `Band`, `RadioStatus`, `TimeEndHour`, `TimeEndMin`, `TimeStartHour`, `TimeStartMin`, `TimerEnable`, `_InstID`.

## `wlan_wlansssidconf_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `wlanBasic`
- Read verified: **yes**
- Response encryption metadata: `KeyPassphrase`, `WEPKey`

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Cancel` | read_reload_via_post | source-derived / untested |

### WLANSSIDConf

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `Enable` | radio | no | not marked by captured encode metadata; re-evaluate on each response |
| `_InstID` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `_WEPCONIG` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `_PSKCONIG` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `BeaconType` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `WEPAuthMode` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `WPAAuthMode` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `11iAuthMode` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `WPAEncryptType` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `11iEncryptType` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `WPA3AuthMode` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `WPA3EncryptType` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `_InstID_WEP0` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `_InstID_WEP1` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `_InstID_WEP2` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `_InstID_WEP3` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `_InstID_PSK` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `MasterAuthServerIp` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `_InstID_GUEST` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `_GUEST` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `GuestWifi` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |
| `ESSID` | text | no | not marked by captured encode metadata; re-evaluate on each response |
| `ESSIDHideEnable` | radio | no | not marked by captured encode metadata; re-evaluate on each response |
| `EncryptionType` | select | no | not marked by captured encode metadata; re-evaluate on each response |
| `KeyPassphrase` | password | yes | required; static attribute or observed response encode metadata |
| `WEPKeyIndex` | select | no | not encrypted: selector; WEPKey prefix metadata applies to password inputs |
| `ShowWEPKey` | checkbox | yes | not marked by captured encode metadata; re-evaluate on each response |
| `WEPKey00` | password | yes | required; static attribute or observed response encode metadata |
| `WEPKey01` | password | yes | required; static attribute or observed response encode metadata |
| `WEPKey02` | password | yes | required; static attribute or observed response encode metadata |
| `WEPKey03` | password | yes | required; static attribute or observed response encode metadata |
| `WLANSSIDConf_Refresh_button` | hidden | no | not marked by captured encode metadata; re-evaluate on each response |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

Observed response field names: `11iAuthMode`, `11iEncryptType`, `Alias`, `Band`, `BeaconType`, `ESSID`, `ESSIDHideEnable`, `EnBandSteer`, `Enable`, `KeyPassphrase`, `MaxUserNum`, `RadioStatus`, `VapIsolationEnable`, `WEPAuthMode`, `WEPKey`, `WEPKeyIndex`, `WLANViewName`, `WPA3AuthMode`, `WPA3EncryptType`, `WPAAuthMode`, `WPAEncryptType`, `WPAGroupRekey`, `_InstID`.

## `wlan_wlanstatus_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `localNetStatus`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=WLAN_CLEAR` | counter_reset | source-derived / untested |

### WLANStatus

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `TotalPacketsReceived` | hidden | no | unknown until response encode metadata is processed |
| `TotalPacketsSent` | hidden | no | unknown until response encode metadata is processed |
| `TotalBytesReceived` | hidden | no | unknown until response encode metadata is processed |
| `TotalBytesSent` | hidden | no | unknown until response encode metadata is processed |

Observed response field names: `11iAuthMode`, `11iEncryptType`, `Alias`, `Band`, `BeaconType`, `Bssid`, `ChannelInUsed`, `ESSID`, `Enable`, `RealRF`, `TotalBytesReceived`, `TotalBytesSent`, `TotalPacketsReceived`, `TotalPacketsSent`, `WEPAuthMode`, `WLANViewName`, `WPA3AuthMode`, `WPAAuthMode`, `WPAEncryptType`, `_InstID`.

## `wlan_wps_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `wps`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |
| POST | `IF_ACTION=Apply` | configuration_write | source-derived / untested |
| POST | `IF_ACTION=Refresh` | security_state_change | source-derived / untested |

Operation parameters: `SSID_InstID`: SSID instance identity.

### WPS

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `_InstID` | hidden | no | unknown until response encode metadata is processed |
| `SSID_InstID` | hidden | no | unknown until response encode metadata is processed |
| `Enable` | hidden | no | unknown until response encode metadata is processed |
| `WPSMode` | hidden | no | unknown until response encode metadata is processed |
| `WpsPINShow` | hidden | yes | unknown until response encode metadata is processed |
| `WPSChoose` | select | no | unknown until response encode metadata is processed |

Preprocessing hooks requiring review: `hiddenValueChangeByCustom`.

Observed response field names: `Band`, `Enable`, `RadioStatus`, `WPSMode`, `_InstID`.

## `wwan_mobile_status_lua.lua`

- Dispatch: `_type=menuData`
- Page contexts: `Wan3gStatus`
- Read verified: **yes**

| Method | Selector | Effect | Evidence status |
|---|---|---|---|
| GET | — | read | observed working |

### Mobile3GStatus

| Wire-field candidate | Control | Sensitive | Encryption evidence |
|---|---|---|---|
| `MobileAlarm` | hidden | no | unknown until response encode metadata is processed |
| `SignalStrength` | hidden | no | unknown until response encode metadata is processed |

Observed response field names: `IMEI`, `MobileAlarm`, `MobileName`, `NetWorkMode`, `SignalStrength`, `_InstID`.

# UPnP SOAP

Opt-in, separate origin/port. No credentials or cookies are forwarded. See SCPD schemas in the JSON catalog for argument names, directions and types. Advertised support is not proof an action works.

## `urn:schemas-microsoft-com:service:OSInfo:1`

Control path: `/upnp/control/OSInfo1`; SCPD: `/gateinfoSCPD.xml`.

| Action | Inputs | Effect | Observed result |
|---|---|---|---|
| MagicOn | none | unknown_do_not_invoke_without_review | untested |

## `urn:schemas-upnp-org:service:WANCommonInterfaceConfig:1`

Control path: `/upnp/control/WANCommonIFC1`; SCPD: `/gateicfgSCPD.xml`.

| Action | Inputs | Effect | Observed result |
|---|---|---|---|
| GetCommonLinkProperties | none | read | SOAP fault |
| GetTotalBytesSent | none | read | successful read |
| GetTotalBytesReceived | none | read | successful read |
| GetTotalPacketsSent | none | read | successful read |
| GetTotalPacketsReceived | none | read | successful read |

## `urn:schemas-upnp-org:service:WANIPConnection:1`

Control path: `/upnp/control/WANIPConn1`; SCPD: `/gateconnSCPD.xml`.

| Action | Inputs | Effect | Observed result |
|---|---|---|---|
| SetConnectionType | NewConnectionType | connectivity_disrupting | untested |
| GetConnectionTypeInfo | none | read | successful read |
| RequestConnection | none | connectivity_disrupting | untested |
| ForceTermination | none | connectivity_disrupting | untested |
| GetStatusInfo | none | read | successful read |
| GetNATRSIPStatus | none | read | successful read |
| GetGenericPortMappingEntry | NewPortMappingIndex | read | successful read |
| GetSpecificPortMappingEntry | NewRemoteHost, NewExternalPort, NewProtocol | read | untested |
| AddPortMapping | NewRemoteHost, NewExternalPort, NewProtocol, NewInternalPort, NewInternalClient, NewEnabled, NewPortMappingDescription, NewLeaseDuration | write_or_device_action | untested |
| DeletePortMapping | NewRemoteHost, NewExternalPort, NewProtocol | write_or_device_action | untested |
| GetExternalIPAddress | none | read | successful read |
| DeletePortMappingRange | NewStartPort, NewEndPort, NewProtocol, NewManage | write_or_device_action | untested |
| GetListOfPortMappings | NewStartPort, NewEndPort, NewProtocol, NewManage, NewNumberOfPorts | read | untested |
| AddAnyPortMapping | NewRemoteHost, NewExternalPort, NewProtocol, NewInternalPort, NewInternalClient, NewEnabled, NewPortMappingDescription, NewLeaseDuration | write_or_device_action | untested |

## `urn:schemas-upnp-org:service:WANIPv6FirewallControl:1`

Control path: `/upnp/control/WANIPv6FwCtrl1`; SCPD: `/gatev6fwctrlSCPD.xml`.

| Action | Inputs | Effect | Observed result |
|---|---|---|---|
| GetFirewallStatus | none | read | SOAP fault |
| GetOutboundPinholeTimeout | RemoteHost, RemotePort, InternalClient, InternalPort, Protocol | read | untested |
| AddPinhole | RemoteHost, RemotePort, InternalClient, InternalPort, Protocol, LeaseTime | write_or_device_action | untested |
| UpdatePinhole | UniqueID, NewLeaseTime | write_or_device_action | untested |
| DeletePinhole | UniqueID | write_or_device_action | untested |
| GetPinholePackets | UniqueID | read | untested |
| CheckPinholeWorking | UniqueID | read | untested |
