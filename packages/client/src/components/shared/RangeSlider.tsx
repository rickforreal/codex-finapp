import React, { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  disabled?: boolean;
  formatLabel?: (value: number) => string;
};

export const RangeSlider = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  disabled = false,
  formatLabel = (v) => v.toString(),
}: Props) => {
  const [minValue, setMinValue] = useState(value[0]);
  const [maxValue, setMaxValue] = useState(value[1]);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const range = useRef<HTMLDivElement>(null);

  // Convert to percentage
  const getPercent = useCallback(
    (value: number) => Math.round(((value - min) / (max - min)) * 100),
    [min, max]
  );

  // Set width of the range to decrease from the left side
  useEffect(() => {
    if (maxRef.current) {
      const minPercent = getPercent(minValue);
      const maxPercent = getPercent(maxValue);

      if (range.current) {
        range.current.style.left = `${minPercent}%`;
        range.current.style.width = `${maxPercent - minPercent}%`;
      }
    }
  }, [minValue, getPercent, maxValue]);

  // Set width of the range to decrease from the right side
  useEffect(() => {
    if (minRef.current) {
      const minPercent = getPercent(minValue);
      const maxPercent = getPercent(maxValue);

      if (range.current) {
        range.current.style.width = `${maxPercent - minPercent}%`;
      }
    }
  }, [maxValue, getPercent, minValue]);

  // Update internal state when value prop changes
  useEffect(() => {
    setMinValue(value[0]);
    setMaxValue(value[1]);
  }, [value]);

  return (
    <div className="relative flex items-center justify-center py-4">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={minValue}
        disabled={disabled}
        ref={minRef}
        onChange={(event) => {
          const val = Math.min(+event.target.value, maxValue - step);
          setMinValue(val);
          onChange([val, maxValue]);
        }}
        className={`thumb thumb--zindex-3 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={maxValue}
        disabled={disabled}
        ref={maxRef}
        onChange={(event) => {
          const val = Math.max(+event.target.value, minValue + step);
          setMaxValue(val);
          onChange([minValue, val]);
        }}
        className={`thumb thumb--zindex-4 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      />

      <div className="slider">
        <div className="slider__track" />
        <div ref={range} className="slider__range" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .slider {
          position: relative;
          width: 100%;
        }

        .slider__track,
        .slider__range {
          position: absolute;
          height: 4px;
          border-radius: 3px;
        }

        .slider__track {
          background-color: #cbd5e1;
          width: 100%;
          z-index: 1;
        }

        .slider__range {
          background-color: #334155;
          z-index: 2;
        }

        /* Removing the default appearance */
        .thumb,
        .thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          -webkit-tap-highlight-color: transparent;
        }

        .thumb {
          pointer-events: none;
          position: absolute;
          height: 0;
          width: 100%;
          outline: none;
          z-index: 3;
        }

        .thumb--zindex-3 {
          z-index: 3;
        }

        .thumb--zindex-4 {
          z-index: 4;
        }

        /* For Chrome browsers */
        .thumb::-webkit-slider-thumb {
          background-color: #f8fafc;
          border: 2px solid #334155;
          border-radius: 50%;
          box-shadow: 0 0 1px 1px #ced4da;
          cursor: pointer;
          height: 18px;
          width: 18px;
          margin-top: 4px;
          pointer-events: all;
          position: relative;
        }

        /* For Firefox browsers */
        .thumb::-moz-range-thumb {
          background-color: #f8fafc;
          border: 2px solid #334155;
          border-radius: 50%;
          box-shadow: 0 0 1px 1px #ced4da;
          cursor: pointer;
          height: 18px;
          width: 18px;
          margin-top: 4px;
          pointer-events: all;
          position: relative;
        }
      `}} />
    </div>
  );
};
