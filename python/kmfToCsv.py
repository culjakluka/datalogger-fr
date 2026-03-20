from canlib import kvmlib
import csv
import argparse
import os

parser = argparse.ArgumentParser(description="Convert KMF files to CSV")
parser.add_argument("input", help="Path to SD card directory containing KMF files (e.g. /mnt or ~/sd_copy)")
parser.add_argument("output", help="Path to output .csv file")
args = parser.parse_args()

input_path = os.path.expanduser(args.input)
if os.path.isdir(input_path):
    kmf_path = os.path.join(input_path, "LOG00000.KMF")
else:
    kmf_path = input_path

if not os.path.exists(kmf_path):
    print(f"Error: Could not find LOG00000.KMF in {input_path}")
    exit(1)

print(f"Opening {kmf_path}...")
kmf = kvmlib.openKmf(kmf_path, kvmlib.Device.MHYDRA_EXT)

with open(args.output, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow([
        "timestamp", "channel", "id", "dlc",
        "byte0", "byte1", "byte2", "byte3",
        "byte4", "byte5", "byte6", "byte7",
        "frame_num"
    ])

    frame_num = 0
    for log_file in kmf.log:
        for event in log_file:
            if isinstance(event, kvmlib.MessageEvent):
                data = bytes(event.data)[:event.dlc]
                # Pad to 8 bytes with empty strings for unused bytes
                byte_cols = [f"{b:02x}" for b in data] + [""] * (8 - len(data))
                writer.writerow([
                    event.timeStamp,
                    event.channel,
                    hex(event.id),
                    event.dlc,
                    *byte_cols,
                    frame_num
                ])
                frame_num += 1

print(f"Done! {frame_num} frames saved to {args.output}")
