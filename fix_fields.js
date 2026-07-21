const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/dashboard/job/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The block to replace is from <div className={styles.inputGroup}> containing OPERATION BY to the end of the parking toggle.
const originalBlock = `              <div className={styles.inputGroup}>
                <label>🤝 OPERATION BY</label>
                <div style={{ display: 'flex', gap: '1.5rem', flexGrow: 1, alignItems: 'center' }}>
                  <label style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none', fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 400 }}>
                    <input disabled={isViewer} type="radio" name="operation_by" value="TI" checked={job.operation_by === 'TI'} onChange={handleChange} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer', accentColor: '#4f46e5' }} /> 
                    TI
                  </label>
                  <label style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none', fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 400 }}>
                    <input disabled={isViewer} type="radio" name="operation_by" value="Outsourced" checked={job.operation_by === 'Outsourced'} onChange={handleChange} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer', accentColor: '#4f46e5' }} /> 
                    Outsourced
                  </label>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label style={job.operation_by !== 'Outsourced' ? { opacity: 0.6 } : undefined}>🤝 OUTSOURCING PARTNER</label>
                <input 
                  name="outsourcing_partner" 
                  value={job.operation_by === 'Outsourced' ? (job.outsourcing_partner || '') : ''} 
                  onChange={handleChange} 
                  disabled={job.operation_by !== 'Outsourced'} 
                  placeholder={job.operation_by === 'Outsourced' ? "Partner name" : "N/A"} 
                  style={job.operation_by !== 'Outsourced' ? { opacity: 0.6, cursor: 'not-allowed', background: 'var(--surface-color)' } : undefined}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>🚗 CAR INCLUDED?</label>
                <ToggleSwitch disabled={isViewer} name="car_included" value={job.car_included === true} onChange={(val) => handleFieldChange('car_included', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>🏋️‍♂️ HEAVY ITEMS</label>
                <ToggleSwitch disabled={isViewer} name="heavy_items" value={job.heavy_items === true || job.heavy_items === 'Yes'} onChange={(val) => handleFieldChange('heavy_items', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>💰 INSURANCE VALUE</label>
                <input 
                  disabled={isViewer} 
                  type="text" 
                  name="insurance_value" 
                  value={job.insurance_value || ''} 
                  onChange={handleChange} 
                  placeholder="Enter value" 
                />
              </div>

              {/* Subheadings for site details */}
              <div style={{ gridColumn: '1', fontWeight: 'bold', fontSize: '0.9rem', color: '#8b5cf6', textTransform: 'uppercase', borderBottom: '1px solid rgba(139, 92, 246, 0.2)', paddingBottom: '0.3rem', marginTop: '0.6rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🛫 ORIGIN SITE:
              </div>
              <div style={{ gridColumn: '2', fontWeight: 'bold', fontSize: '0.9rem', color: '#ec4899', textTransform: 'uppercase', borderBottom: '1px solid rgba(236, 72, 153, 0.2)', paddingBottom: '0.3rem', marginTop: '0.6rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🛬 DESTINATION SITE:
              </div>

                              {isFieldVisible(isViewer, job.origin_floor || '') && (
                                <div className={styles.inputGroup}><label>🏢 FLOOR</label><input disabled={isViewer} type="number" name="origin_floor" value={job.origin_floor || ''} onChange={handleChange} /></div>
                              )}
                              {isFieldVisible(isViewer, job.dest_floor || '') && (
                                <div className={styles.inputGroup}><label>🏢 FLOOR</label><input disabled={isViewer} type="number" name="dest_floor" value={job.dest_floor || ''} onChange={handleChange} /></div>
                              )}
              <div className={styles.inputGroup}>
                <label>🛗 SERVICE LIFT</label>
                <ToggleSwitch disabled={isViewer} name="origin_service_lift" value={job.origin_service_lift === true || job.origin_service_lift === 'Yes'} onChange={(val) => handleFieldChange('origin_service_lift', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>🛗 SERVICE LIFT</label>
                <ToggleSwitch disabled={isViewer} name="dest_service_lift" value={job.dest_service_lift === true || job.dest_service_lift === 'Yes'} onChange={(val) => handleFieldChange('dest_service_lift', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>🅿️ PARKING</label>
                <ToggleSwitch disabled={isViewer} name="origin_parking" value={job.origin_parking === true || job.origin_parking === 'Yes'} onChange={(val) => handleFieldChange('origin_parking', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>🅿️ PARKING</label>
                <ToggleSwitch disabled={isViewer} name="dest_parking" value={job.dest_parking === true || job.dest_parking === 'Yes'} onChange={(val) => handleFieldChange('dest_parking', val)} />
              </div>`;

const newBlock = `              {isFieldVisible(isViewer, job.operation_by) && (
                <div className={styles.inputGroup}>
                  <label>🤝 OPERATION BY</label>
                  <div style={{ display: 'flex', gap: '1.5rem', flexGrow: 1, alignItems: 'center' }}>
                    <label style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none', fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 400 }}>
                      <input disabled={isViewer} type="radio" name="operation_by" value="TI" checked={job.operation_by === 'TI'} onChange={handleChange} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer', accentColor: '#4f46e5' }} /> 
                      TI
                    </label>
                    <label style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none', fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 400 }}>
                      <input disabled={isViewer} type="radio" name="operation_by" value="Outsourced" checked={job.operation_by === 'Outsourced'} onChange={handleChange} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer', accentColor: '#4f46e5' }} /> 
                      Outsourced
                    </label>
                  </div>
                </div>
              )}
              {isFieldVisible(isViewer, job.operation_by === 'Outsourced' ? job.outsourcing_partner : '') && (
                <div className={styles.inputGroup}>
                  <label style={job.operation_by !== 'Outsourced' ? { opacity: 0.6 } : undefined}>🤝 OUTSOURCING PARTNER</label>
                  <input 
                    name="outsourcing_partner" 
                    value={job.operation_by === 'Outsourced' ? (job.outsourcing_partner || '') : ''} 
                    onChange={handleChange} 
                    disabled={job.operation_by !== 'Outsourced'} 
                    placeholder={job.operation_by === 'Outsourced' ? "Partner name" : "N/A"} 
                    style={job.operation_by !== 'Outsourced' ? { opacity: 0.6, cursor: 'not-allowed', background: 'var(--surface-color)' } : undefined}
                  />
                </div>
              )}
              {isFieldVisible(isViewer, job.car_included) && (
                <div className={styles.inputGroup}>
                  <label>🚗 CAR INCLUDED?</label>
                  <ToggleSwitch disabled={isViewer} name="car_included" value={job.car_included === true} onChange={(val) => handleFieldChange('car_included', val)} />
                </div>
              )}
              {isFieldVisible(isViewer, job.heavy_items) && (
                <div className={styles.inputGroup}>
                  <label>🏋️‍♂️ HEAVY ITEMS</label>
                  <ToggleSwitch disabled={isViewer} name="heavy_items" value={job.heavy_items === true || job.heavy_items === 'Yes'} onChange={(val) => handleFieldChange('heavy_items', val)} />
                </div>
              )}
              {isFieldVisible(isViewer, job.insurance_value) && (
                <div className={styles.inputGroup}>
                  <label>💰 INSURANCE VALUE</label>
                  <input 
                    disabled={isViewer} 
                    type="text" 
                    name="insurance_value" 
                    value={job.insurance_value || ''} 
                    onChange={handleChange} 
                    placeholder="Enter value" 
                  />
                </div>
              )}

              {/* Subheadings for site details */}
              {(isFieldVisible(isViewer, job.origin_floor) || isFieldVisible(isViewer, job.origin_service_lift) || isFieldVisible(isViewer, job.origin_parking)) && (
                <div style={{ gridColumn: '1', fontWeight: 'bold', fontSize: '0.9rem', color: '#8b5cf6', textTransform: 'uppercase', borderBottom: '1px solid rgba(139, 92, 246, 0.2)', paddingBottom: '0.3rem', marginTop: '0.6rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🛫 ORIGIN SITE:
                </div>
              )}
              {(isFieldVisible(isViewer, job.dest_floor) || isFieldVisible(isViewer, job.dest_service_lift) || isFieldVisible(isViewer, job.dest_parking)) && (
                <div style={{ gridColumn: '2', fontWeight: 'bold', fontSize: '0.9rem', color: '#ec4899', textTransform: 'uppercase', borderBottom: '1px solid rgba(236, 72, 153, 0.2)', paddingBottom: '0.3rem', marginTop: '0.6rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🛬 DESTINATION SITE:
                </div>
              )}

              {isFieldVisible(isViewer, job.origin_floor) && (
                <div className={styles.inputGroup}><label>🏢 FLOOR</label><input disabled={isViewer} type="number" name="origin_floor" value={job.origin_floor || ''} onChange={handleChange} /></div>
              )}
              {isFieldVisible(isViewer, job.dest_floor) && (
                <div className={styles.inputGroup}><label>🏢 FLOOR</label><input disabled={isViewer} type="number" name="dest_floor" value={job.dest_floor || ''} onChange={handleChange} /></div>
              )}
              {isFieldVisible(isViewer, job.origin_service_lift) && (
                <div className={styles.inputGroup}>
                  <label>🛗 SERVICE LIFT</label>
                  <ToggleSwitch disabled={isViewer} name="origin_service_lift" value={job.origin_service_lift === true || job.origin_service_lift === 'Yes'} onChange={(val) => handleFieldChange('origin_service_lift', val)} />
                </div>
              )}
              {isFieldVisible(isViewer, job.dest_service_lift) && (
                <div className={styles.inputGroup}>
                  <label>🛗 SERVICE LIFT</label>
                  <ToggleSwitch disabled={isViewer} name="dest_service_lift" value={job.dest_service_lift === true || job.dest_service_lift === 'Yes'} onChange={(val) => handleFieldChange('dest_service_lift', val)} />
                </div>
              )}
              {isFieldVisible(isViewer, job.origin_parking) && (
                <div className={styles.inputGroup}>
                  <label>🅿️ PARKING</label>
                  <ToggleSwitch disabled={isViewer} name="origin_parking" value={job.origin_parking === true || job.origin_parking === 'Yes'} onChange={(val) => handleFieldChange('origin_parking', val)} />
                </div>
              )}
              {isFieldVisible(isViewer, job.dest_parking) && (
                <div className={styles.inputGroup}>
                  <label>🅿️ PARKING</label>
                  <ToggleSwitch disabled={isViewer} name="dest_parking" value={job.dest_parking === true || job.dest_parking === 'Yes'} onChange={(val) => handleFieldChange('dest_parking', val)} />
                </div>
              )}`;

content = content.replace(originalBlock, newBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced block!');
