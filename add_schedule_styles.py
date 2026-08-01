# Add scheduling CSS styles
css_path = r'E:\BeeHive\apps\control-center\src\components\cortes\cortes.css'

styles = '''

/* Schedule Section */
.cortes-schedule-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cortes-mode-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cortes-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cortes-mode-options {
  display: flex;
  gap: 8px;
}

.cortes-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.cortes-mode-btn:hover {
  background: var(--surface-2);
  color: var(--text);
}

.cortes-mode-btn.active {
  background: rgba(var(--primary-rgb), 0.1);
  border-color: var(--primary);
  color: var(--primary);
}

.cortes-date-config {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px;
  background: var(--bg);
  border-radius: 8px;
  border: 1px solid var(--border-light);
}

.cortes-date-config .cortes-form-group {
  margin-bottom: 0;
  flex: 1;
  min-width: 150px;
}

.cortes-rules-info {
  margin-top: 12px;
  padding: 12px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
}

.cortes-rules-info h4 {
  font-size: 12px;
  font-weight: 600;
  color: var(--blue);
  margin: 0 0 8px;
}

.cortes-rules-info ul {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
}

.cortes-schedule-preview {
  padding: 12px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
}

.cortes-schedule-preview h4 {
  font-size: 12px;
  font-weight: 600;
  color: var(--success);
  margin: 0 0 10px;
}

.cortes-time-slots {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cortes-time-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  min-width: 80px;
}

.cortes-time-slot span:first-child {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.cortes-slot-label {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}
'''

with open(css_path, 'a', encoding='utf-8') as f:
    f.write(styles)

print("CSS added!")
