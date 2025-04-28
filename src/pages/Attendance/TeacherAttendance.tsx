import React, { useCallback, useEffect } from 'react';

const fetchAttendance = useCallback(() => {
  // ... existing code ...
}, []);

useEffect(() => {
  fetchAttendance();
}, [fetchAttendance]); 