import React from 'react';
import { useSettings } from '../hooks/useSettings';

const SettingsButton: React.FC = () => {
  const { openSettings } = useSettings();

  return (
    <button className="settings-button" onClick={() => openSettings()} aria-label="Open Settings">
      ⚙️
    </button>
  );
};

export default SettingsButton;