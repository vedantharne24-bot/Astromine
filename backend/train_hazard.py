from ultralytics import YOLO

def main():
    print("🚀 ASTROMINE AI: Initiating Hazard Detection Training Sequence...")

    # 1. Load a pre-trained YOLOv8 Nano model (Fastest for real-time rover inference)
    model = YOLO('yolov8n.pt') 

    # 2. Begin the training process
    results = model.train(
        data='dataset/data.yaml',  # The map to our dataset we just configured
        epochs=50,                 # The AI will study the entire dataset 50 times
        imgsz=640,                 # Resize all images to 640x640 for consistency
        batch=16,                  # Feed 16 images at a time to maximize the 8GB VRAM of the RTX 4060
        device=0,                  # Force the system to use the NVIDIA GPU (Device 0) instead of the CPU
        name='astromine_hazard_v1',# The folder where our final trained brain will be saved
        verbose=True
    )

    print("✅ ASTROMINE AI: Training Complete. Model saved successfully.")

if __name__ == '__main__':
    # This prevents Windows multi-processing crashes during training
    main()