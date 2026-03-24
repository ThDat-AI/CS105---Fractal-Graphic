// scripts/ui.js
// Quản lý giao diện: dropdown, params, stats

const UI = (() => {
  const fractalSelect    = document.getElementById('fractalSelect');
  const paramsContainer  = document.getElementById('paramsContainer');
  const infoText         = document.getElementById('infoText');
  const renderBtn        = document.getElementById('renderBtn');
  const resetBtn         = document.getElementById('resetBtn');
  const canvasOverlay    = document.getElementById('canvasOverlay');
  const canvasLabel      = document.getElementById('canvasLabel');
  const statFps          = document.getElementById('statFps');
  const statType         = document.getElementById('statType');
  const statIter         = document.getElementById('statIter');

  let _onRender = null; // callback được set từ init()

  // Debounce helper - tránh render quá nhiều lần khi kéo nhanh
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  const triggerAutoRender = debounce(() => {
    if (_onRender) {
      _onRender(fractalSelect.value, getParams(fractalSelect.value));
    }
  }, 120); // 120ms sau khi ngừng kéo mới render

  // Render param controls dynamically
  function buildParams(fractalKey) {
    const config = FRACTAL_PARAMS[fractalKey];
    if (!config) return;

    infoText.textContent = config.info;
    paramsContainer.innerHTML = '';

    config.params.forEach(p => {
      const group = document.createElement('div');
      group.className = 'control-group param-row';

      if (p.type === 'range') {
        group.innerHTML = `
          <div class="param-header">
            <span class="param-name">${p.name.toUpperCase()}</span>
            <span class="param-value" id="val_${p.id}">${p.default}</span>
          </div>
          <input type="range"
            id="${p.id}" name="${p.id}"
            min="${p.min}" max="${p.max}" step="${p.step}" value="${p.default}"
            data-autorender="true"
          />
          ${p.hint ? `<small style="color:var(--text-dim);font-size:11px;font-family:var(--font-mono)">${p.hint}</small>` : ''}
        `;
        paramsContainer.appendChild(group);

        const input = document.getElementById(p.id);
        const valEl = document.getElementById('val_' + p.id);

        // Cập nhật giá trị hiển thị ngay lập tức
        input.addEventListener('input', () => {
          valEl.textContent = input.value;
          // Auto-render khi kéo slider (debounced)
          triggerAutoRender();
        });

      } else if (p.type === 'number') {
        group.innerHTML = `
          <label class="ctrl-label" for="${p.id}">${p.name.toUpperCase()}</label>
          <input type="number"
            id="${p.id}" name="${p.id}"
            min="${p.min}" max="${p.max}" step="${p.step}" value="${p.default}"
          />
        `;
        paramsContainer.appendChild(group);

      } else if (p.type === 'color') {
        group.innerHTML = `
          <label class="ctrl-label" for="${p.id}">${p.name.toUpperCase()}</label>
          <div class="color-row">
            <input type="color" id="${p.id}" name="${p.id}" value="${p.default}" />
            <span id="colorlabel_${p.id}" style="font-family:var(--font-mono);font-size:12px;color:var(--text-dim)">${p.default}</span>
          </div>
        `;
        paramsContainer.appendChild(group);

        const inp = document.getElementById(p.id);
        const lbl = document.getElementById('colorlabel_' + p.id);
        inp.addEventListener('input', () => {
          lbl.textContent = inp.value;
          triggerAutoRender();
        });
      }
    });
  }

  // Get current param values as object
  function getParams(fractalKey) {
    const config = FRACTAL_PARAMS[fractalKey];
    const result = {};
    if (!config) return result;
    config.params.forEach(p => {
      const el = document.getElementById(p.id);
      if (!el) return;
      if (p.type === 'range' || p.type === 'number') {
        result[p.id] = parseFloat(el.value);
      } else {
        result[p.id] = el.value;
      }
    });
    return result;
  }

  function setStats(fps, type, iter) {
    statFps.textContent  = fps  !== null ? fps  : '—';
    statType.textContent = type !== null ? type : '—';
    statIter.textContent = iter !== null ? iter : '—';
  }

  function setCanvasLabel(text, active = false) {
    canvasLabel.textContent = text;
    canvasLabel.className   = 'canvas-label' + (active ? ' active' : '');
  }

  function showOverlay()  { canvasOverlay.classList.remove('hidden'); }
  function hideOverlay()  { canvasOverlay.classList.add('hidden'); }

  // Init
  function init(onAutoRender, onReset) {
    _onRender = onAutoRender;
    buildParams(fractalSelect.value);

    // Thêm auto-render badge vào panel header
    const panelHeader = document.querySelector('.panel-header');
    if (panelHeader) {
      const badge = document.createElement('span');
      badge.className = 'auto-badge';
      badge.title = 'Tự động render khi kéo slider';
      badge.textContent = 'AUTO';
      panelHeader.appendChild(badge);
    }

    fractalSelect.addEventListener('change', () => {
      buildParams(fractalSelect.value);
    });

    resetBtn.addEventListener('click', () => {
      buildParams(fractalSelect.value);
      onReset();
    });
  }

  return { init, getParams, setStats, setCanvasLabel, showOverlay, hideOverlay };
})();
