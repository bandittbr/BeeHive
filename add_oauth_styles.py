# Add OAuth styles to cortes.css
css_path = r'E:\BeeHive\apps\control-center\src\components\cortes\cortes.css'

with open(css_path, 'a', encoding='utf-8') as f:
    f.write('''

/* OAuth Section */
.cortes-actions-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.cortes-oauth-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cortes-platform-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cortes-platform-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.cortes-platform-btn:hover:not(:disabled) {
  background: var(--surface-2);
  transform: translateY(-1px);
}

.cortes-platform-btn.connecting {
  opacity: 0.7;
  cursor: not-allowed;
}

.cortes-platform-icon {
  font-size: 14px;
  line-height: 1;
}

.cortes-social-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-top: 8px;
}

.cortes-social-form select,
.cortes-social-form input {
  padding: 7px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  outline: none;
}
''')

print("CSS added!")
