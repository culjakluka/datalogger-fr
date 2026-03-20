# Datalogger Electron App Specification

## Overview

Simple Electron app that listens to a CAN network with a USB to CAN interface, decodes and visualizes mock BMS and VCU CAN signals, and exports cleaned data for analysis.

## Running
In order to get live messages from can system needs to support SocketCAN.

In order to get support for loading .kmf files throught datalogger: 
- **python3** need to be installed on system.
- KvaserSDK needs to be insatlled 

*Setting up python env:*
```sh
python3 -m venv .venv
pip install canlib
```

## Input/Output

- **Input:** CAN messages from the network.
- **Output CSV columns:** timestamp_ms, bms_state, battery_soc_pct, power_limit_w, vcu_state, gas_request_pct, map_mode, power_request_w.

## UI

- One window with tabs: Charts, Table, Export.
- Charts support pan/zoom.

---

## Tracked Signals (to Graph)

1. **Battery SoC over time** (line chart) - from BMS 0x100.
2. **Gas pedal request over time** (line chart) - from VCU 0x200.
3. **Power limit over time** (line chart) - from BMS 0x100.
4. **Power request over time** (line chart) - from VCU 0x200.
5. **State changes** (scatter or event log) - BMS state & VCU state changes marked on timeline.
6. **Error state entries** (highlight) - when either BMS or VCU enter ERROR state.

---

## Decoding

- **BMS 0x100 at 10 Hz:**
  - Byte0: state (0=IDLE, 1=READY, 2=ERROR)
  - Byte1-2: battery SoC (0.1 %)
  - Byte3-4: power limit (1 W)
- **VCU 0x200 at 20 Hz:**
  - Byte0: state (0=IDLE, 1=READY, 2=ERROR)
  - Byte1-2: gas request (0.1 %)
  - Byte3: map (0=ECO, 1=NORMAL, 2=SPORT)
  - Byte4-5: power request (1 W)

---
