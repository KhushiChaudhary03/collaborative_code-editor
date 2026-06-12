import React, { memo } from 'react';
import Avatar from 'react-avatar';

// Memoized so avatar never re-renders unless username/size changes.
// This prevents the flickering caused by parent re-renders on every keystroke.
const Client = memo(({ username, size = 28 }) => {
  return (
    <Avatar
      name={username}
      size={size}
      round="6px"
      style={{ display: 'block' }}
    />
  );
});

Client.displayName = 'Client';

export default Client;
