
window.openPassportPhotoEditor = function (file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith("image/")) {
            reject(new Error("Please select a valid image."));
            return;
        }

        const imageUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            let brightness = 100;
            let contrast = 100;
            let saturation = 100;
            let rotation = 0;

            const overlay = document.createElement("div");
            overlay.className = "photo-editor-overlay";

            overlay.innerHTML = `
                <div class="photo-editor-modal">
                    <div class="photo-editor-header">
                        <div>
                            <h2>Photo Editor</h2>
                            <p>Adjust your passport photo</p>
                        </div>
                        <button type="button" class="editor-close">×</button>
                    </div>

                    <div class="photo-editor-preview">
                        <canvas class="editor-canvas"></canvas>
                    </div>

                    <div class="photo-editor-controls">
                        <div class="editor-control">
                            <label>
                                Brightness
                                <span class="brightness-value">100%</span>
                            </label>
                            <input type="range" class="brightness-slider"
                                min="50" max="150" value="100">
                        </div>

                        <div class="editor-control">
                            <label>
                                Contrast
                                <span class="contrast-value">100%</span>
                            </label>
                            <input type="range" class="contrast-slider"
                                min="50" max="150" value="100">
                        </div>

                        <div class="editor-control">
                            <label>
                                Saturation
                                <span class="saturation-value">100%</span>
                            </label>
                            <input type="range" class="saturation-slider"
                                min="0" max="200" value="100">
                        </div>
                    </div>

                    <div class="photo-editor-actions">
                        <button type="button" class="editor-rotate-left">
                            Rotate Left
                        </button>
                        <button type="button" class="editor-rotate-right">
                            Rotate Right
                        </button>
                        <button type="button" class="editor-reset">
                            Reset
                        </button>
                    </div>

                    <div class="photo-editor-footer">
                        <button type="button" class="editor-cancel">
                            Cancel
                        </button>
                        <button type="button" class="editor-apply">
                            Apply Changes
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const canvas = overlay.querySelector(".editor-canvas");
            const ctx = canvas.getContext("2d");

            const brightnessSlider =
                overlay.querySelector(".brightness-slider");
            const contrastSlider =
                overlay.querySelector(".contrast-slider");
            const saturationSlider =
                overlay.querySelector(".saturation-slider");

            const brightnessValue =
                overlay.querySelector(".brightness-value");
            const contrastValue =
                overlay.querySelector(".contrast-value");
            const saturationValue =
                overlay.querySelector(".saturation-value");

            const applyButton = overlay.querySelector(".editor-apply");

            function drawImage() {
                const sideways = Math.abs(rotation) % 180 === 90;

                canvas.width = sideways ? image.height : image.width;
                canvas.height = sideways ? image.width : image.height;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                ctx.save();

                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(rotation * Math.PI / 180);

                ctx.filter = `
                    brightness(${brightness}%)
                    contrast(${contrast}%)
                    saturate(${saturation}%)
                `;

                ctx.drawImage(
                    image,
                    -image.width / 2,
                    -image.height / 2,
                    image.width,
                    image.height
                );

                ctx.restore();
            }

            function updateEditor() {
                brightness = Number(brightnessSlider.value);
                contrast = Number(contrastSlider.value);
                saturation = Number(saturationSlider.value);

                brightnessValue.textContent = `${brightness}%`;
                contrastValue.textContent = `${contrast}%`;
                saturationValue.textContent = `${saturation}%`;

                drawImage();
            }

            brightnessSlider.addEventListener("input", updateEditor);
            contrastSlider.addEventListener("input", updateEditor);
            saturationSlider.addEventListener("input", updateEditor);

            overlay.querySelector(".editor-rotate-left")
                .addEventListener("click", () => {
                    rotation = (rotation - 90 + 360) % 360;
                    drawImage();
                });

            overlay.querySelector(".editor-rotate-right")
                .addEventListener("click", () => {
                    rotation = (rotation + 90) % 360;
                    drawImage();
                });

            overlay.querySelector(".editor-reset")
                .addEventListener("click", () => {
                    brightness = 100;
                    contrast = 100;
                    saturation = 100;
                    rotation = 0;

                    brightnessSlider.value = 100;
                    contrastSlider.value = 100;
                    saturationSlider.value = 100;

                    updateEditor();
                });

            let finished = false;

            function closeEditor(result) {
                if (finished) return;

                finished = true;
                overlay.remove();
                URL.revokeObjectURL(imageUrl);
                resolve(result);
            }

            overlay.querySelector(".editor-close")
                .addEventListener("click", () => closeEditor(null));

            overlay.querySelector(".editor-cancel")
                .addEventListener("click", () => closeEditor(null));

            overlay.addEventListener("click", (event) => {
                if (event.target === overlay) {
                    closeEditor(null);
                }
            });

            function handleEscape(event) {
                if (event.key === "Escape") {
                    closeEditor(null);
                }
            }

            document.addEventListener("keydown", handleEscape);

            const originalClose = closeEditor;

            function cleanupAndClose(result) {
                document.removeEventListener("keydown", handleEscape);
                originalClose(result);
            }

            overlay.querySelector(".editor-close").onclick =
                () => cleanupAndClose(null);

            overlay.querySelector(".editor-cancel").onclick =
                () => cleanupAndClose(null);

            applyButton.addEventListener("click", () => {
                applyButton.disabled = true;
                applyButton.textContent = "Applying...";

                canvas.toBlob((blob) => {
                    if (!blob) {
                        applyButton.disabled = false;
                        applyButton.textContent = "Apply Changes";
                        alert("Could not process this image.");
                        return;
                    }

                    const editedFile = new File(
                        [blob],
                        `edited-${file.name.replace(/\.[^/.]+$/, "")}.jpg`,
                        {
                            type: "image/jpeg",
                            lastModified: Date.now()
                        }
                    );

                    cleanupAndClose(editedFile);

                }, "image/jpeg", 0.95);
            });

            drawImage();
        };

        image.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error("Could not open this image."));
        };

        image.src = imageUrl;
    });
};
