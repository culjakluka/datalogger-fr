from canlib import kvmlib
import csv
import argparse

parser = argparse.ArgumentParser(description="Convert KMF file to CSV")
parser.add_argument("input", help="Path to .KMF file (e.g. /mnt/LOG00000.KMF)")
parser.add_argument("output", help="Path to output .csv file")
args = parser.parse_args()

kmf = kvmlib.openKmf(args.input, kvmlib.Device.MHYDRA_EXT)

with open(args.output, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["timestamp", "channel", "id", "dlc", "data"])

    for log_file in kmf.log:
        for event in log_file:
            if isinstance(event, kvmlib.MessageEvent):
                writer.writerow([
                    event.timeStamp,
                    event.channel,
                    hex(event.id),
                    event.dlc,
                    bytes(event.data).hex()
                ])

print(f"Done! Saved to {args.output}")
