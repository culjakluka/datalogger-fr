from canlib import kvmlib
import csv
import argparse

parser = argparse.ArgumentParser(description="Convert KME50 file to CSV")
parser.add_argument("input", help="Path to .kme50 file")
parser.add_argument("output", help="Path to output .csv file")
args = parser.parse_args()

kme = kvmlib.openKme(args.input)

with open(args.output, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["timestamp", "channel", "id", "dlc", "data"])
    while True:
        try:
            event = kme.read_event()
            if isinstance(event, kvmlib.MessageEvent):
                writer.writerow([
                    event.timeStamp,
                    event.channel,
                    hex(event.id),
                    event.dlc,
                    bytes(event.data).hex()
                ])
        except kvmlib.KvmNoLogMsg:
            break

print(f"Done! Saved to {args.output}")
