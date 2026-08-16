'use client';
import React, { useState, useEffect, useRef } from 'react';
import { transformImage } from '../../services/imageProcessor';
import Icon from './Icons';

export default function ImageEditorModal({ image, onSave, onClose }) {
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [removeBg, setRemoveBg] = useState(false);
  const [tolerance, setTolerance] = useState(35);
  const [previewUrl, setPreviewUrl] = useState(image?.url || '');
  const [previewSizeKB, setPreviewSizeKB] = useState(image?.sizeKB || 0);
  const [processing, setProcessing] = useState(false);

  const updatePreview = async (rot, fH, fV, rmBg, tol) => {
    if (!image?.url) return;
    setProcessing(true);
    try {
      const res = await transformImage(image.url, {
        rotation: rot,
        flipH: fH,
        flipV: fV,
        removeBg: rmBg,
        tolerance: tol
      });
      setPreviewUrl(res.url);
      setPreviewSizeKB(res.sizeKB);
    } catch (e) {
      console.error('Transform error:', e);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    updatePreview(rotation, flipH, flipV, removeBg, tolerance);
  }, [rotation, flipH, flipV, removeBg, tolerance]);

  const handleRotateLeft = () => {
    setRotation(prev => (prev - 90 + 360) % 360);
  };

  const handleRotateRight = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleToggleFlipH = () => {
    setFlipH(prev => !prev);
  };

  const handleToggleFlipV = () => {
    setFlipV(prev => !prev);
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setRemoveBg(false);
    setTolerance(35);
  };

  const handleApply = () => {
    onSave({
      ...image,
      url: previewUrl,
      sizeKB: previewSizeKB,
      format: 'webp'
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '90%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Product Image Studio</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>
              Transform, rotate, flip, and remove background in WebP format (Max: 200KB).
            </p>
          </div>
          <span className="badge badge-success">
            {previewSizeKB} KB &middot; WEBP
          </span>
        </div>

        {/* Live Canvas Viewport with transparent grid */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '320px',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 20px 20px',
            border: '1px solid var(--border)',
            marginBottom: '16px'
          }}
        >
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
                transition: 'transform 0.15s ease'
              }}
            />
          )}

          {processing && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              Processing...
            </div>
          )}
        </div>

        {/* Toolbar Controls */}
        <div style={{ background: 'var(--muted)', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleRotateLeft}
              title="Rotate Left 90°"
            >
              ↶ Rotate Left
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleRotateRight}
              title="Rotate Right 90°"
            >
              ↷ Rotate Right
            </button>
            <button
              type="button"
              className={`btn btn-sm ${flipH ? 'btn-primary' : ''}`}
              onClick={handleToggleFlipH}
              title="Flip Horizontal"
            >
              ⇄ Flip H
            </button>
            <button
              type="button"
              className={`btn btn-sm ${flipV ? 'btn-primary' : ''}`}
              onClick={handleToggleFlipV}
              title="Flip Vertical"
            >
              ⇅ Flip V
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>

          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={(e) => setRemoveBg(e.target.checked)}
                />
                Remove Background (Auto Studio Cutout)
              </label>

              {removeBg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span>Tolerance:</span>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                    style={{ width: '100px' }}
                  />
                  <span>{tolerance}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleApply}>
            Save Image Changes
          </button>
        </div>
      </div>
    </div>
  );
}
