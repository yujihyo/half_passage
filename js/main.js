const state = {
  background: "pink",
  photoData: "",
  font: "gothic",
  size: 1,
  color: "white",
  align: "left",
  dark: false
};

const preview = document.getElementById("preview");
const text1Preview = document.getElementById("text1Preview");
const text2Preview = document.getElementById("text2Preview");
const text3Preview = document.getElementById("text3Preview");
const text4Preview = document.getElementById("text4Preview");
const mainCopy = document.getElementById("mainCopy");
const darkOverlay = document.getElementById("darkOverlay");

const text1Input = document.getElementById("text1Input");
const text2Input = document.getElementById("text2Input");
const text3Input = document.getElementById("text3Input");
const text4Input = document.getElementById("text4Input");

const imageInput = document.getElementById("imageInput");
const photoOption = document.getElementById("photoOption");

const cropModal = document.getElementById("cropModal");
const cropImage = document.getElementById("cropImage");
const cropViewport = document.getElementById("cropViewport");
const cropZoom = document.getElementById("cropZoom");

const noticeModal =
  document.getElementById("noticeModal");

const noticeClose =
  document.getElementById("noticeClose");

const NOTICE_KEY = "halfpassage-notice";


if (sessionStorage.getItem(NOTICE_KEY)) {

  noticeModal.style.display = "none";

}

noticeClose.addEventListener("click", () => {

  noticeModal.style.display = "none";

  sessionStorage.setItem(
    NOTICE_KEY,
    "checked"
  );

});

let cropImageInfo = null;
let cropTransform = { x: 0, y: 0, scale: 1 };
let dragging = false;
let dragStart = null;

function updateText() {
  text2Preview.textContent = text2Input.value || "";
  text3Preview.textContent = text3Input.value || "";
  text4Preview.textContent = text4Input.value || "";

  // Only text1 changes with the size control. Text2~4 remain fixed.
  text1Preview.style.fontSize = `${sizeToPx(state.size)}px`;
  if (window.innerWidth > 900) {
    text2Preview.style.fontSize = "18px";
    text3Preview.style.fontSize = "15px";
    text4Preview.style.fontSize = "11px";
  } else {
    text2Preview.style.fontSize = "13px";
    text3Preview.style.fontSize = "11px";
    text4Preview.style.fontSize = "8px";
  }

  mainCopy.className = `main-copy align-${state.align}`;
  text1Preview.className = `text1 color-${state.color} font-${state.font}`;
  text2Preview.className = `text2 color-${state.color} font-gothic`;
  text3Preview.className = `text3 color-${state.color} font-gothic`;
  text4Preview.className = `text4 color-${state.color} font-gothic`;

  // The whole text1~3 group is centered vertically. As text1 grows,
  // the group becomes taller, so its top naturally moves upward while
  // text2/text3 move downward. The group never enters the source area.
  requestAnimationFrame(layoutQuoteText);
}

function layoutQuoteText() {
  const source = text1Input.value || "";
  text1Preview.textContent = source;

  // Clear the previous limit before measuring the current font.
  text1Preview.style.maxHeight = "none";

  requestAnimationFrame(() => {
    if (!mainCopy.clientHeight) return;

    const mainStyle = getComputedStyle(mainCopy);
    const text1Style = getComputedStyle(text1Preview);
    const text2Style = getComputedStyle(text2Preview);
    const text3Style = getComputedStyle(text3Preview);

    const lineHeight = parseFloat(text1Style.lineHeight) || (sizeToPx(state.size) * 1.48);
    const text2Height = text2Preview.getBoundingClientRect().height || parseFloat(text2Style.lineHeight) || 16;
    const text3Height = text3Preview.getBoundingClientRect().height || parseFloat(text3Style.lineHeight) || 16;
    const text1Margin = parseFloat(text1Style.marginBottom) || 0;
    const text2Margin = parseFloat(text2Style.marginBottom) || 0;

    // Reserve enough room for text2, text3 and their spacing first.
    // Whatever remains is the maximum height available to text1.
    const available = mainCopy.clientHeight - text2Height - text3Height - text1Margin - text2Margin;
    const safeHeight = Math.max(lineHeight, available);

    // Only complete line boxes are allowed. This prevents the bottom of a
    // Korean glyph from being cut when the font becomes large.
    const maxLines = Math.max(1, Math.floor((safeHeight + 0.5) / lineHeight));
    const maxHeight = maxLines * lineHeight;
    text1Preview.style.maxHeight = `${maxHeight}px`;

    if (!source) return;

    // If all text fits, keep it exactly as entered.
    if (text1Preview.scrollHeight <= maxHeight + 1) return;

    // Remove whole characters from the end until the rendered text fits.
    // This preserves natural wrapping and never leaves a half-visible glyph.
    const chars = Array.from(source);
    let lo = 0;
    let hi = chars.length;

    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      text1Preview.textContent = chars.slice(0, mid).join("");
      if (text1Preview.scrollHeight <= maxHeight + 1) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    text1Preview.textContent = chars.slice(0, lo).join("");

    // Rounding around a line-wrap boundary can differ by a fraction of a px.
    while (text1Preview.textContent && text1Preview.scrollHeight > maxHeight + 1) {
      const current = Array.from(text1Preview.textContent);
      current.pop();
      text1Preview.textContent = current.join("");
    }
  });
}

function sizeToPx(size) {
  // PC
  if (window.innerWidth > 900) {
    return [24, 28, 32, 36, 40][size - 1];
  }

  // 모바일
  return [15, 18, 21, 24, 27][size - 1];
}

function setBackground(type) {
  state.background = type;

  preview.classList.remove(
    "bg-pink", "bg-pink2", "bg-green", "bg-blue", "bg-purple", "has-photo"
  );

  if (type === "photo" && state.photoData) {
    preview.classList.add("has-photo");
    preview.style.backgroundImage = `url("${state.photoData}")`;
    preview.style.backgroundSize = "cover";
    preview.style.backgroundPosition = "center";
  } else {
    preview.style.backgroundImage = "";
    preview.style.backgroundSize = "";
    preview.style.backgroundPosition = "";
    preview.classList.add(`bg-${type}`);
  }

  document.querySelectorAll(".bg-option").forEach(btn => btn.classList.remove("selected"));
  if (type === "photo") {
    photoOption.classList.remove("hidden");
    photoOption.classList.add("selected");
  } else {
    const button = document.querySelector(`.bg-option[data-bg="${type}"]`);
    if (button) button.classList.add("selected");
  }
}

function setFont(font) {
  state.font = font;
  document.querySelectorAll(".font-option").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.font === font);
  });
  updateText();
}

function setColor(color) {
  state.color = color;
  document.querySelectorAll(".color-option").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.color === color);
  });
  updateText();
}

function setAlign(align) {
  state.align = align;
  document.querySelectorAll(".align-option").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.align === align);
  });
  mainCopy.className = `main-copy align-${align} font-${state.font}`;
  updateText();
}

document.querySelectorAll(".bg-option[data-bg]").forEach(button => {
  button.addEventListener("click", () => setBackground(button.dataset.bg));
});

photoOption.addEventListener("click", () => {
  if (state.photoData) setBackground("photo");
});

document.querySelectorAll(".font-option").forEach(button => {
  button.addEventListener("click", () => setFont(button.dataset.font));
});

document.querySelectorAll(".color-option").forEach(button => {
  button.addEventListener("click", () => setColor(button.dataset.color));
});

document.querySelectorAll(".align-option").forEach(button => {
  button.addEventListener("click", () => setAlign(button.dataset.align));
});

document.getElementById("sizeMinus").addEventListener("click", () => {
  if (state.size > 1) state.size--;
  document.getElementById("sizeValue").textContent = state.size;
  updateText();
});

document.getElementById("sizePlus").addEventListener("click", () => {
  if (state.size < 5) state.size++;
  document.getElementById("sizeValue").textContent = state.size;
  updateText();
});

document.getElementById("darkToggle").addEventListener("click", (e) => {
  state.dark = !state.dark;
  e.currentTarget.classList.toggle("on", state.dark);
  e.currentTarget.setAttribute("aria-pressed", String(state.dark));
  darkOverlay.classList.toggle("on", state.dark);
});

[text1Input, text2Input, text3Input, text4Input].forEach(input => {
  input.addEventListener("input", updateText);
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => openCropModal(reader.result);
  reader.readAsDataURL(file);

  // Allows selecting the same file again later.
  imageInput.value = "";
});

function openCropModal(src) {
  cropModal.classList.remove("hidden");
  cropModal.setAttribute("aria-hidden", "false");
  cropZoom.value = "1";

  cropImage.onload = () => {
    const vw = cropViewport.clientWidth;
    const vh = cropViewport.clientHeight;
    const iw = cropImage.naturalWidth;
    const ih = cropImage.naturalHeight;

    const cover = Math.max(vw / iw, vh / ih);
    cropImageInfo = { iw, ih, cover };
    cropTransform = { x: 0, y: 0, scale: 1 };
    renderCropImage();
  };

  cropImage.src = src;
}

function closeCropModal() {
  cropModal.classList.add("hidden");
  cropModal.setAttribute("aria-hidden", "true");
}

function renderCropImage() {
  if (!cropImageInfo) return;

  const { iw, ih, cover } = cropImageInfo;
  const vw = cropViewport.clientWidth;
  const vh = cropViewport.clientHeight;

  const scale = cover * cropTransform.scale;
  const width = iw * scale;
  const height = ih * scale;

  cropImage.style.width = `${width}px`;
  cropImage.style.height = `${height}px`;
  cropImage.style.left = `${(vw - width) / 2 + cropTransform.x}px`;
  cropImage.style.top = `${(vh - height) / 2 + cropTransform.y}px`;
}

function clampCropPosition() {
  if (!cropImageInfo) return;

  const { iw, ih, cover } = cropImageInfo;
  const vw = cropViewport.clientWidth;
  const vh = cropViewport.clientHeight;
  const scale = cover * cropTransform.scale;

  const width = iw * scale;
  const height = ih * scale;

  const minX = (vw - width) / 2;
  const maxX = (width - vw) / 2;
  const minY = (vh - height) / 2;
  const maxY = (height - vh) / 2;

  cropTransform.x = Math.max(minX, Math.min(maxX, cropTransform.x));
  cropTransform.y = Math.max(minY, Math.min(maxY, cropTransform.y));
}

cropZoom.addEventListener("input", () => {
  const oldScale = cropTransform.scale;
  const newScale = Number(cropZoom.value);

  if (oldScale !== newScale) {
    // Keep the current center stable while zooming.
    cropTransform.scale = newScale;
    clampCropPosition();
    renderCropImage();
  }
});

document.getElementById("cropZoomMinus").addEventListener("click", () => {
  cropZoom.value = Math.max(1, Number(cropZoom.value) - 0.1).toFixed(2);
  cropZoom.dispatchEvent(new Event("input"));
});

document.getElementById("cropZoomPlus").addEventListener("click", () => {
  cropZoom.value = Math.min(3, Number(cropZoom.value) + 0.1).toFixed(2);
  cropZoom.dispatchEvent(new Event("input"));
});

cropViewport.addEventListener("pointerdown", (e) => {
  if (!cropImageInfo) return;
  e.preventDefault();
  dragging = true;
  cropViewport.setPointerCapture(e.pointerId);
  dragStart = {
    x: e.clientX,
    y: e.clientY,
    baseX: cropTransform.x,
    baseY: cropTransform.y
  };
});

cropViewport.addEventListener("pointermove", (e) => {
  if (!dragging || !dragStart || !cropImageInfo) return;
  e.preventDefault();

  cropTransform.x = dragStart.baseX + (e.clientX - dragStart.x);
  cropTransform.y = dragStart.baseY + (e.clientY - dragStart.y);
  clampCropPosition();
  renderCropImage();
});

function stopCropDrag() {
  dragging = false;
  dragStart = null;
}

cropViewport.addEventListener("pointerup", stopCropDrag);
cropViewport.addEventListener("pointercancel", stopCropDrag);
cropViewport.addEventListener("lostpointercapture", stopCropDrag);

document.getElementById("cropClose").addEventListener("click", closeCropModal);
document.getElementById("cropCancel").addEventListener("click", closeCropModal);
document.querySelector(".modal-backdrop").addEventListener("click", closeCropModal);

document.getElementById("cropConfirm").addEventListener("click", () => {
  if (!cropImageInfo) return;

  const output = document.createElement("canvas");
  const size = 2400;
  output.width = size;
  output.height = size;

  const ctx = output.getContext("2d");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const { iw, ih, cover } = cropImageInfo;
  const vw = cropViewport.clientWidth;
  const vh = cropViewport.clientHeight;

  const scale = cover * cropTransform.scale;
  const width = iw * scale;
  const height = ih * scale;
  const left = (vw - width) / 2 + cropTransform.x;
  const top = (vh - height) / 2 + cropTransform.y;

  const factor = size / vw;

  ctx.drawImage(
    cropImage,
    left * factor,
    top * factor,
    width * factor,
    height * factor
  );

  state.photoData = output.toDataURL("image/png");
  photoOption.style.backgroundImage = `url("${state.photoData}")`;
  photoOption.classList.remove("hidden");
  setBackground("photo");
  closeCropModal();
});

document.getElementById("cancelButton").addEventListener("click", () => {
  // Reset to the initial values without leaving the page.
  text1Input.value = "주절주절 여기에 멘트를 적을 수 있어요";
  text2Input.value = "제목or작품명";
  text3Input.value = "작가명 Ⅰ 회차";
  text4Input.value = "관련 출처";

  state.background = "pink";
  state.photoData = "";
  state.font = "gothic";
  state.size = 1;
  state.color = "white";
  state.align = "left";
  state.dark = false;

  photoOption.classList.add("hidden");
  photoOption.style.backgroundImage = "";
  document.getElementById("sizeValue").textContent = "1";
  document.getElementById("darkToggle").classList.remove("on");
  darkOverlay.classList.remove("on");

  document.querySelectorAll(".font-option").forEach(b => b.classList.toggle("selected", b.dataset.font === "gothic"));
  document.querySelectorAll(".color-option").forEach(b => b.classList.toggle("selected", b.dataset.color === "white"));
  document.querySelectorAll(".align-option").forEach(b => b.classList.toggle("selected", b.dataset.align === "left"));

  setBackground("pink");
  updateText();
});

document.getElementById("saveButton").addEventListener("click", async () => {
  const button = document.getElementById("saveButton");
  const original = button.textContent;

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isMobile = window.innerWidth <= 900;

  // 모바일 Safari 저장 전 확인
  if (isIOS) {
    const confirmed = confirm(
      "이미지를 저장하시겠습니까?\n확인 시 저장 화면으로 이동합니다."
    );

    if (!confirmed) {
      return;
    }
  }

  button.textContent = "저장 중…";
  button.disabled = true;

  /*
   * iOS Safari에서는 비동기 작업 이후 window.open()을 실행하면
   * 팝업으로 인식되어 차단될 수 있습니다.
   *
   * 따라서 저장 버튼을 누른 순간 빈 창을 먼저 열어둡니다.
   */
  let iosWindow = null;

  if (isIOS) {
    iosWindow = window.open("", "_blank");

    if (iosWindow) {
      iosWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>이미지 저장</title>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              background: #000;
              width: 100%;
              min-height: 100%;
            }

            body {
              display: flex;
              justify-content: center;
              align-items: flex-start;
            }

            img {
              display: block;
              width: 100%;
              height: auto;
              max-width: 100%;
            }
          </style>
        </head>
        <body>
          <p style="
            color:white;
            font-family:sans-serif;
            text-align:center;
            width:100%;
            margin-top:40px;
          ">
            이미지 생성 중…
          </p>
        </body>
        </html>
      `);

      iosWindow.document.close();
    }
  }

  try {
    if (typeof html2canvas !== "function") {
      throw new Error("html2canvas unavailable");
    }

    const rect = preview.getBoundingClientRect();

    const previewWidth = Math.floor(rect.width);
    const previewHeight = Math.floor(rect.height);

    const outputSize = isMobile ? 1600 : previewWidth * 2;

    const captureScale = outputSize / previewWidth;

    /*
     * 현재 사진 background를 임시로 제거합니다.
     *
     * 중요:
     * 사진 자체는 아래에서 직접 Canvas에 그립니다.
     * html2canvas에는 텍스트/오버레이만 맡깁니다.
     */
    const originalBackgroundImage = preview.style.backgroundImage;
    const originalBackgroundSize = preview.style.backgroundSize;
    const originalBackgroundPosition = preview.style.backgroundPosition;

    const hasPhoto =
      state.background === "photo" &&
      state.photoData;

    if (hasPhoto) {
      preview.style.backgroundImage = "none";
    }

    /*
     * 사진을 제외한 프리뷰를 캡처합니다.
     */
    const overlayCanvas = await html2canvas(preview, {
      width: previewWidth,
      height: previewHeight,
      scale: captureScale,
      useCORS: true,
      backgroundColor: null,
      logging: false
    });

    /*
     * 원래 프리뷰 상태 복원
     */
    preview.style.backgroundImage = originalBackgroundImage;
    preview.style.backgroundSize = originalBackgroundSize;
    preview.style.backgroundPosition = originalBackgroundPosition;

    /*
     * 최종 저장 Canvas
     */
    const output = document.createElement("canvas");
    output.width = outputSize;
    output.height = outputSize;

    const ctx = output.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    /*
     * ------------------------------------------------
     * 1. 사진을 직접 그립니다.
     * ------------------------------------------------
     */
    if (hasPhoto) {
      const photo = new Image();

      await new Promise((resolve, reject) => {
        photo.onload = resolve;
        photo.onerror = reject;

        /*
         * state.photoData는 현재 2400×2400 PNG입니다.
         */
        photo.src = state.photoData;
      });

      /*
       * 현재 사진은 이미 정사각형으로 잘려 있으므로
       * 프리뷰 전체를 정확하게 덮습니다.
       */
      ctx.drawImage(
        photo,
        0,
        0,
        outputSize,
        outputSize
      );
    }

    /*
     * ------------------------------------------------
     * 2. 사진 위에 html2canvas 결과를 올립니다.
     * ------------------------------------------------
     */
    ctx.drawImage(
      overlayCanvas,
      0,
      0,
      outputSize,
      outputSize
    );

    /*
     * 최종 PNG
     */
    const imageData = output.toDataURL("image/png");

    /*
     * ------------------------------------------------
     * iOS Safari
     * ------------------------------------------------
     */
    if (isIOS) {

      if (iosWindow) {

        iosWindow.document.open();

        iosWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta name="viewport"
              content="width=device-width, initial-scale=1.0">

            <title>이미지 저장</title>

            <style>
              html,
              body {
                margin: 0;
                padding: 0;
                background: #000;
                width: 100%;
                min-height: 100%;
              }

              body {
                display: flex;
                justify-content: center;
                align-items: flex-start;
              }

              img {
                display: block;
                width: 100%;
                height: auto;
                max-width: 100%;
              }
            </style>
          </head>

          <body>
            <img src="${imageData}" alt="저장할 이미지">
          </body>
          </html>
        `);

        iosWindow.document.close();

      } else {

        /*
         * 팝업이 차단된 경우
         */
        alert(
          "이미지를 열 수 없습니다.\n\n" +
          "Safari의 팝업 차단이 켜져 있다면 팝업을 허용한 후 다시 시도해주세요."
        );
      }

    } else {

      /*
       * PC / Android
       */
      const link = document.createElement("a");

      link.download = "웹소설공유.png";
      link.href = imageData;

      link.click();
    }

  } catch (error) {

    console.error(error);

    if (iosWindow) {
      iosWindow.close();
    }

    alert("이미지를 저장하지 못했습니다.");

  } finally {

    button.textContent = original;
    button.disabled = false;
  }
});

window.addEventListener("resize", () => {
  if (!cropModal.classList.contains("hidden")) {
    clampCropPosition();
    renderCropImage();
  }
});

updateText();
setBackground("pink");
