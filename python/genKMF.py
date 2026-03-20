import argparse
import random
from canlib import kvmlib

parser = argparse.ArgumentParser(description="Generate fake KME50 file with CAN data")
parser.add_argument("output", help="Path to output .kme50 file")
parser.add_argument("--rows", type=int, default=100, help="Number of CAN frames to generate")
args = parser.parse_args()

CAN_IDS = [0x100, 0x200, 0x300, 0x4B0, 0x7DF]

kme = kvmlib.createKme(args.output, kvmlib.FileType.KME50)

timestamp = 0
for _ in range(args.rows):
    timestamp += random.randint(1000, 50000)  # microseconds
    can_id = random.choice(CAN_IDS)
    dlc = random.randint(1, 8)
    data = bytes(random.randint(0, 255) for _ in range(dlc))

    msg = kvmlib.MessageEvent(
        id=can_id,
        channel=random.randint(0, 1),
        dlc=dlc,
        flags=0,
        data=data,
        timestamp=timestamp,
    )

    kme.write_event(msg)

kme.close()
print(f"Generated {args.rows} frames -> {args.output}")
