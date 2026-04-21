import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
import numpy as np
import os

TRAIN_DIR = r"C:\Users\tugan\Downloads\archive\NEU-DET\train\images"
VAL_DIR   = r"C:\Users\tugan\Downloads\archive\NEU-DET\validation\images"
IMG_SIZE  = (224, 224)
BATCH     = 32
EPOCHS    = 15
CLASSES   = 6

print("Setting up data generators...")
train_gen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    horizontal_flip=True,
    zoom_range=0.1
)

val_gen = ImageDataGenerator(rescale=1./255)

train_data = train_gen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH,
    class_mode="categorical"
)

val_data = val_gen.flow_from_directory(
    VAL_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH,
    class_mode="categorical"
)

print(f"Classes found: {train_data.class_indices}")
print(f"Training samples: {train_data.samples}")
print(f"Validation samples: {val_data.samples}")

print("Loading MobileNetV2 base model...")
base_model = MobileNetV2(
    weights="imagenet",
    include_top=False,
    input_shape=(224, 224, 3)
)
base_model.trainable = False

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(256, activation="relu")(x)
x = Dropout(0.3)(x)
x = Dense(128, activation="relu")(x)
x = Dropout(0.2)(x)
output = Dense(CLASSES, activation="softmax")(x)

model = Model(inputs=base_model.input, outputs=output)

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

print("Starting training...")
callbacks = [
    EarlyStopping(patience=3, restore_best_weights=True, verbose=1),
    ModelCheckpoint("ml/cnn_best.keras", save_best_only=True, verbose=1)
]

history = model.fit(
    train_data,
    epochs=EPOCHS,
    validation_data=val_data,
    callbacks=callbacks,
    verbose=1
)

print("\n--- Fine tuning top layers ---")
base_model.trainable = True
for layer in base_model.layers[:-20]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

history2 = model.fit(
    train_data,
    epochs=5,
    validation_data=val_data,
    callbacks=callbacks,
    verbose=1
)

os.makedirs("ml", exist_ok=True)
model.save("ml/defect_model.keras")

import json
class_indices = train_data.class_indices
with open("ml/class_indices.json", "w") as f:
    json.dump(class_indices, f)

print("\n--- Training Complete ---")
print(f"Model saved to ml/defect_model.keras")
print(f"Classes: {class_indices}")

final_val_acc = max(history.history["val_accuracy"])
print(f"Best validation accuracy: {final_val_acc:.4f} ({final_val_acc*100:.1f}%)")