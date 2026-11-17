
(function () {
    "use strict";

    window.openPassportCropEditor = function (file) {
        return new Promise((resolve, reject) => {

            if (!file || !file.type.startsWith("image/")) {
                reject(new Error("Please select a valid image."));
                return;
            }

            const image = new Image();
            const imageUrl = URL.createObjectURL(file);

            const modal = document.createElement("div");

            modal.style.cssText = `
                position: fixed;
                inset: 0;
                z-index: 99999;
                background: rgba(11, 18, 32, 0.88);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                overflow-y: auto;
            `;

            modal.innerHTML = `
                <div style="
                    background: #fff;
                    width: min(440px, 100%);
                    border-radius: 18px;
                    padding: 22px;
                    font-family: Arial, sans-serif;
                    color: #0f172a;
                    box-shadow: 0 20px 60px rgba(0,0,0,.3);
                ">

                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 10px;
                    ">
                        <div>
                            <h2 style="margin:0;font-size:21px;">
                                Crop Photo
                            </h2>

                            <p style="
                                margin:6px 0 16px;
                                color:#64748b;
                                font-size:13px;
                            ">
                                Drag the photo to adjust its position.
                            </p>
                        </div>

                        <button type="button" data-action="close"
                            style="
                                border:0;
                                background:#f1f5f9;
                                border-radius:8px;
                                padding:9px 12px;
                                cursor:pointer;
                            ">
                            ✕
                        </button>
                    </div>

                    <div style="
                        width:min(300px, 100%);
                        aspect-ratio:3/4;
                        margin:0 auto;
                        overflow:hidden;
                        background:#e2e8f0;
                        border:2px solid #2563eb;
                        border-radius:8px;
                        touch-action:none;
                    ">
                        <canvas style="
                            width:100%;
                            height:100%;
                            display:block;
                            cursor:grab;
                            touch-action:none;
                        "></canvas>
                    </div>

                    <div style="margin-top:20px;">

                        <div style="
                            display:flex;
                            justify-content:space-between;
                            font-size:13px;
                            font-weight:600;
                            margin-bottom:8px;
                        ">
                            <label>Zoom</label>
                            <span data-zoom-value>1.0x</span>
                        </div>

                        <input
                            data-zoom
                            type="range"
                            min="1"
                            max="3"
                            step="0.05"
                            value="1"
                            style="width:100%;accent-color:#2563eb;"
                        >

                        <p style="
                            font-size:12px;
                            color:#64748b;
                            margin:8px 0 0;
                        ">
                            Move the photo with your mouse or finger.
                            The blue frame shows the final crop.
                        </p>
                    </div>

                    <div style="
                        display:flex;
                        gap:10px;
                        margin-top:20px;
                    ">
                        <button type="button" data-action="cancel"
                            style="
                                flex:1;
                                padding:12px;
                                border:1px solid #cbd5e1;
                                background:#fff;
                                border-radius:9px;
                                font-weight:700;
                                cursor:pointer;
                            ">
                            Cancel
                        </button>

                        <button type="button" data-action="save"
                            style="
                                flex:1;
                                padding:12px;
                                border:0;
                                background:#2563eb;
                                color:#fff;
                                border-radius:9px;
                                font-weight:700;
                                cursor:pointer;
                            ">
                            Apply Crop
                        </button>
                    </div>

                </div>
            `;

            document.body.appendChild(modal);

            const canvas = modal.querySelector("canvas");
            const ctx = canvas.getContext("2d");

            const zoomInput = modal.querySelector("[data-zoom]");
            const zoomValue = modal.querySelector("[data-zoom-value]");

            const viewportWidth = 900;
            const viewportHeight = 1200;

            canvas.width = viewportWidth;
            canvas.height = viewportHeight;

            let baseScale = 1;
            let zoom = 1;

            let offsetX = 0;
            let offsetY = 0;

            let dragging = false;
            let lastX = 0;
            let lastY = 0;

            let finished = false;

            function dimensions() {
                return {
                    width: image.naturalWidth * baseScale * zoom,
                    height: image.naturalHeight * baseScale * zoom
                };
            }

            function constrainPosition() {
                const size = dimensions();

                const minX = viewportWidth - size.width;
                const minY = viewportHeight - size.height;

                offsetX = Math.min(0, Math.max(minX, offsetX));
                offsetY = Math.min(0, Math.max(minY, offsetY));
            }

            function draw() {
                const size = dimensions();

                ctx.clearRect(
                    0, 0,
                    viewportWidth,
                    viewportHeight
                );

                ctx.fillStyle = "#ffffff";

                ctx.fillRect(
                    0, 0,
                    viewportWidth,
                    viewportHeight
                );

                ctx.drawImage(
                    image,
                    offsetX,
                    offsetY,
                    size.width,
                    size.height
                );

                zoomValue.textContent = zoom.toFixed(1) + "x";
            }

            function cleanup(result) {
                if (finished) return;

                finished = true;

                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );

                URL.revokeObjectURL(imageUrl);

                modal.remove();

                resolve(result);
            }

            function fail(error) {
                if (finished) return;

                finished = true;

                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );

                URL.revokeObjectURL(imageUrl);

                modal.remove();

                reject(error);
            }

            function cancel() {
                cleanup(null);
            }

            function escapeHandler(event) {
                if (event.key === "Escape" && !finished) {
                    cancel();
                }
            }

            image.onload = () => {

                const coverScale = Math.max(
                    viewportWidth / image.naturalWidth,
                    viewportHeight / image.naturalHeight
                );

                baseScale = coverScale;

                offsetX = (
                    viewportWidth -
                    image.naturalWidth * baseScale
                ) / 2;

                offsetY = (
                    viewportHeight -
                    image.naturalHeight * baseScale
                ) / 2;

                draw();
            };

            image.onerror = () => {
                fail(new Error("Could not open this image."));
            };

            image.src = imageUrl;

            zoomInput.addEventListener("input", () => {

                const oldSize = dimensions();

                const centerX = viewportWidth / 2;
                const centerY = viewportHeight / 2;

                const relativeX = (
                    centerX - offsetX
                ) / oldSize.width;

                const relativeY = (
                    centerY - offsetY
                ) / oldSize.height;

                zoom = Number(zoomInput.value);

                const newSize = dimensions();

                offsetX = centerX - relativeX * newSize.width;
                offsetY = centerY - relativeY * newSize.height;

                constrainPosition();

                draw();
            });

            canvas.addEventListener("pointerdown", (event) => {

                dragging = true;

                lastX = event.clientX;
                lastY = event.clientY;

                canvas.setPointerCapture(event.pointerId);

                canvas.style.cursor = "grabbing";
            });

            canvas.addEventListener("pointermove", (event) => {

                if (!dragging) return;

                const rect = canvas.getBoundingClientRect();

                const factorX = viewportWidth / rect.width;
                const factorY = viewportHeight / rect.height;

                offsetX += (
                    event.clientX - lastX
                ) * factorX;

                offsetY += (
                    event.clientY - lastY
                ) * factorY;

                lastX = event.clientX;
                lastY = event.clientY;

                constrainPosition();

                draw();
            });

            function stopDragging() {
                dragging = false;
                canvas.style.cursor = "grab";
            }

            canvas.addEventListener("pointerup", stopDragging);
            canvas.addEventListener("pointercancel", stopDragging);
            canvas.addEventListener("lostpointercapture", stopDragging);

            modal.querySelector(
                '[data-action="close"]'
            ).addEventListener("click", cancel);

            modal.querySelector(
                '[data-action="cancel"]'
            ).addEventListener("click", cancel);

            modal.querySelector(
                '[data-action="save"]'
            ).addEventListener("click", () => {

                const output = document.createElement("canvas");

                output.width = viewportWidth;
                output.height = viewportHeight;

                const outputContext = output.getContext("2d");

                const size = dimensions();

                outputContext.drawImage(
                    image,
                    offsetX,
                    offsetY,
                    size.width,
                    size.height
                );

                output.toBlob((blob) => {

                    if (!blob) {
                        fail(new Error(
                            "Could not export cropped photo."
                        ));
                        return;
                    }

                    const croppedFile = new File(
                        [blob],
                        "cropped-" +
                        file.name.replace(/\.[^.]+$/, "") +
                        ".jpg",
                        { type: "image/jpeg" }
                    );

                    cleanup(croppedFile);

                }, "image/jpeg", 0.95);
            });

            modal.addEventListener("click", (event) => {
                if (event.target === modal) {
                    cancel();
                }
            });

            document.addEventListener(
                "keydown",
                escapeHandler
            );

        });
    };

})();
