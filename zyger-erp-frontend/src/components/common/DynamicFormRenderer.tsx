import { useRef, useCallback } from 'react';

interface InspectionCharacteristic {
  id?: number;
  balloonNo?: string;
  characteristicCode: string;
  characteristicName: string;
  dataType?: string;
  nominalValue?: string | number;
  lowerLimit?: string | number;
  upperLimit?: string | number;
  specificationText?: string;
  uom?: string;
  isMandatory?: boolean;
  isCritical?: boolean;
  isSpecial?: boolean;
  measurementMethod?: string;
  requiredInstrumentType?: string;
  lineNo?: number;
}

interface DraftLine {
  balloonNo?: string;
  characteristicCode: string;
  characteristicName: string;
  uom: string;
  nominalValue: string;
  lowerLimit: string;
  upperLimit: string;
  actualValue: string;
  isCritical: boolean;
  isMandatory?: boolean;
  instrumentCode: string;
  dataType?: string;
  specificationText?: string;
}

interface DynamicFormRendererProps {
  characteristics: InspectionCharacteristic[];
  draftLines: DraftLine[];
  onUpdate: (index: number, field: keyof DraftLine, value: string) => void;
  onPaste?: (data: string[][]) => void;
  readOnly?: boolean;
}

function evaluatePass(dataType: string | undefined, actual: string, lower: string | number, upper: string | number): 'PASS' | 'FAIL' | 'PENDING' {
  if (!actual || actual.trim() === '') return 'PENDING';
  const dt = dataType || 'NUMERIC';

  if (dt === 'YES_NO') {
    return actual.trim() === 'Yes' || actual.trim() === 'YES' || actual.trim() === 'Y' ? 'PASS' : 'FAIL';
  }

  if (dt === 'NUMERIC') {
    const val = parseFloat(actual);
    const lo = parseFloat(String(lower));
    const hi = parseFloat(String(upper));
    if (isNaN(val)) return 'FAIL';
    if (!isNaN(lo) && val < lo) return 'FAIL';
    if (!isNaN(hi) && val > hi) return 'FAIL';
    return 'PASS';
  }

  return actual.trim() ? 'PASS' : 'PENDING';
}

export default function DynamicFormRenderer({ characteristics, draftLines, onUpdate, onPaste, readOnly }: DynamicFormRendererProps) {
  const tableRef = useRef<HTMLTableElement>(null);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (readOnly || !onPaste) return;
    const text = e.clipboardData.getData('text');
    if (!text || !text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();

    const rows = text.split('\n').filter(r => r.trim()).map(r => r.split('\t'));
    onPaste(rows);
  }, [readOnly, onPaste]);

  const getEval = (idx: number) => {
    const line = draftLines[idx];
    if (!line) return 'PENDING';
    const ch = characteristics.find(c => c.characteristicCode === line.characteristicCode) || characteristics[idx];
    return evaluatePass(ch?.dataType, line.actualValue, ch?.lowerLimit ?? line.lowerLimit, ch?.upperLimit ?? line.upperLimit);
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>
          Characteristics
          <span style={{ fontSize: 12, color: '#6c7086', marginLeft: 8, fontWeight: 400 }}>
            ({characteristics.length} defined)
          </span>
        </h4>
        {onPaste && !readOnly && (
          <span style={{ fontSize: 11, color: '#6c7086' }}>
            Paste from Excel: select first Actual cell, Ctrl+V
          </span>
        )}
      </div>

      <table
        ref={tableRef}
        className="inspection-grid"
        onPaste={handlePaste}
        style={{
          width: '100%',
          fontSize: 12,
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          border: '1px solid #313244',
          minWidth: 900,
        }}
      >
        <thead>
          <tr style={{ background: 'rgba(49,50,68,0.35)' }}>
            <th style={{ ...thStyle, width: 32, textAlign: 'center' }}>#</th>
            <th style={{ ...thStyle, width: 170 }}>Characteristic</th>
            <th style={{ ...thStyle, width: 50, textAlign: 'center' }}>UOM</th>
            <th style={{ ...thStyle, width: 80, textAlign: 'right' }}>Nominal</th>
            <th style={{ ...thStyle, width: 60, textAlign: 'right' }}>Lo</th>
            <th style={{ ...thStyle, width: 60, textAlign: 'right' }}>Hi</th>
            <th style={{ ...thStyle, width: 100 }}>Actual</th>
            <th style={{ ...thStyle, width: 72, textAlign: 'center' }}>Status</th>
            <th style={{ ...thStyle, width: 120 }}>Spec</th>
            <th style={{ ...thStyle, width: 130 }}>Instrument</th>
            <th style={{ ...thStyle, width: 28, textAlign: 'center' }}>M</th>
            <th style={{ ...thStyle, width: 28, textAlign: 'center' }}>C</th>
          </tr>
        </thead>
        <tbody>
          {draftLines.map((line, idx) => {
            const ch = characteristics.find(c => c.characteristicCode === line.characteristicCode) || characteristics[idx];
            const dt = ch?.dataType || 'NUMERIC';
            const evalResult = getEval(idx);

            return (
              <tr
                key={idx}
                style={{
                  background: evalResult === 'FAIL' ? 'rgba(243,139,168,0.06)' : 'transparent',
                }}
              >
                <td style={{ ...tdStyle, textAlign: 'center', color: '#6c7086' }}>
                  {line.balloonNo || (ch?.balloonNo ?? idx + 1)}
                </td>
                <td style={{ ...tdStyle, fontWeight: ch?.isCritical ? 600 : 400, color: ch?.isCritical ? '#f38ba8' : '#cdd6f4' }}>
                  {line.characteristicName}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{line.uom || ch?.uom || ''}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{line.nominalValue || ch?.nominalValue || ''}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{line.lowerLimit || ch?.lowerLimit || ''}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{line.upperLimit || ch?.upperLimit || ''}</td>

                {/* Actual value input */}
                <td style={tdStyle}>
                  {readOnly ? (
                    <span>{line.actualValue || '—'}</span>
                  ) : dt === 'YES_NO' ? (
                    <select
                      className="in"
                      value={line.actualValue || ''}
                      onChange={e => onUpdate(idx, 'actualValue', e.target.value)}
                      style={{ width: '100%', fontSize: 12, padding: '2px 4px' }}
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  ) : (
                    <input
                      className="in"
                      type={dt === 'NUMERIC' ? 'number' : 'text'}
                      value={line.actualValue || ''}
                      onChange={e => onUpdate(idx, 'actualValue', e.target.value)}
                      step={dt === 'NUMERIC' ? 'any' : undefined}
                      style={{
                        width: '100%',
                        fontSize: 12,
                        padding: '2px 4px',
                        fontWeight: 600,
                        textAlign: dt === 'NUMERIC' ? 'right' : 'left',
                        fontVariantNumeric: dt === 'NUMERIC' ? 'tabular-nums' : 'normal',
                        color: evalResult === 'PASS' ? '#a6e3a1' : evalResult === 'FAIL' ? '#f38ba8' : '#cdd6f4',
                      }}
                    />
                  )}
                </td>

                {/* Pass/Fail status indicator */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      background: evalResult === 'PASS' ? 'rgba(166,227,161,0.15)' : evalResult === 'FAIL' ? 'rgba(243,139,168,0.2)' : 'rgba(108,112,134,0.15)',
                      color: evalResult === 'PASS' ? '#a6e3a1' : evalResult === 'FAIL' ? '#f38ba8' : '#6c7086',
                    }}
                  >
                    {evalResult}
                  </span>
                </td>

                <td style={tdStyle}>
                  {ch?.specificationText || (ch?.nominalValue ? `${ch.nominalValue} (${ch.lowerLimit ?? ''}–${ch.upperLimit ?? ''})` : '')}
                </td>

                <td style={tdStyle}>
                  {readOnly ? (
                    <span>{line.instrumentCode || '—'}</span>
                  ) : (
                    <input
                      className="in"
                      value={line.instrumentCode || ''}
                      onChange={e => onUpdate(idx, 'instrumentCode', e.target.value)}
                      placeholder={ch?.requiredInstrumentType || 'Instrument'}
                      style={{ width: '100%', fontSize: 11, padding: '2px 4px' }}
                    />
                  )}
                </td>

                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {(line.isMandatory ?? ch?.isMandatory) ? 'M' : ''}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', color: ch?.isCritical ? '#f38ba8' : undefined }}>
                  {line.isCritical || ch?.isCritical ? 'C' : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {draftLines.length === 0 && (
        <div style={{ padding: 24, textAlign: 'center', color: '#6c7086', fontSize: 13 }}>
          No characteristics defined. Select an Inspection Plan or add lines manually.
        </div>
      )}
    </div>
  );
}

export type { InspectionCharacteristic, DraftLine };

const thStyle: React.CSSProperties = {
  padding: '6px 6px',
  fontWeight: 600,
  fontSize: 11,
  color: '#a6adc8',
  whiteSpace: 'nowrap',
  borderRight: '1px solid #313244',
  borderBottom: '1px solid #313244',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 6px',
  borderRight: '1px solid #262637',
  borderBottom: '1px solid #262637',
  verticalAlign: 'middle',
};
