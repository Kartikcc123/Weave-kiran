from pathlib import Path
import cv2
import random

DATASET = Path(r"D:\fabric-ai\datasets\Fabric2025")

IMAGE_DIR = DATASET / "train" / "images"
LABEL_DIR = DATASET / "train" / "labels"

OUTPUT_DIR = DATASET / "verification"
OUTPUT_DIR.mkdir(exist_ok=True)

random.seed(42)

images = list(IMAGE_DIR.glob("*.jpg"))

samples = random.sample(
    images,
    min(10, len(images))
)

names = [
    "Stain",
    "Thread",
    "Warp_Weft",
    "hole",
    "seam"
]

for image_path in samples:

    label_path = LABEL_DIR / f"{image_path.stem}.txt"

    image = cv2.imread(str(image_path))

    if image is None:
        continue

    h, w = image.shape[:2]

    if label_path.exists():

        with open(label_path, "r") as f:
            lines = f.readlines()

        for line in lines:

            parts = line.strip().split()

            if len(parts) != 5:
                continue

            class_id = int(parts[0])

            xc = float(parts[1])
            yc = float(parts[2])
            bw = float(parts[3])
            bh = float(parts[4])

            x1 = int((xc - bw / 2) * w)
            y1 = int((yc - bh / 2) * h)

            x2 = int((xc + bw / 2) * w)
            y2 = int((yc + bh / 2) * h)

            cv2.rectangle(
                image,
                (x1, y1),
                (x2, y2),
                (0, 0, 255),
                3
            )

            label = names[class_id]

            cv2.putText(
                image,
                label,
                (x1, max(30, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 0, 255),
                2
            )

    cv2.imwrite(
        str(OUTPUT_DIR / image_path.name),
        image
    )

print("Verification complete.")
print(f"Open: {OUTPUT_DIR}")