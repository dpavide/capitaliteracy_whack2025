import React, { useState, useRef, useCallback } from 'react';
import { Box, Typography, Paper, useTheme, TextField, Button, Alert } from '@mui/material';
import { tokens } from '../theme';

const InteractivePieChart = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const categoryColors = {
    'Groceries': colors.greenAccent[600],
    'Travel': colors.blueAccent[600],
    'Entertainment': '#e91e63',
    'Shopping': '#ff9800',
    'Bills': colors.redAccent[600],
    'Eating Out': '#9c27b0',
    'Everything Else': colors.gray[600],
  };

  const [segments, setSegments] = useState([
    { name: 'Groceries', percentage: 20 },
    { name: 'Travel', percentage: 15 },
    { name: 'Entertainment', percentage: 10 },
    { name: 'Shopping', percentage: 15 },
    { name: 'Bills', percentage: 20 },
    { name: 'Eating Out', percentage: 10 },
    { name: 'Everything Else', percentage: 10 },
  ]);

  const radius = 150;
  const centerX = 200;
  const centerY = 200;

  // Calculate total percentage
  const getTotalPercentage = () => {
    return segments.reduce((sum, segment) => sum + segment.percentage, 0);
  };

  // Handle manual input change
  const handleInputChange = (index, value) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    
    const newSegments = [...segments];
    newSegments[index].percentage = clampedValue;
    setSegments(newSegments);
  };

  // Auto-fill to make total 100%
  const handleAutoFill = () => {
    const total = getTotalPercentage();
    const diff = 100 - total;
    
    if (diff === 0) return; // Already at 100%

    // Find non-zero segments to distribute the difference
    const nonZeroSegments = segments.filter(s => s.percentage > 0);
    
    if (nonZeroSegments.length === 0) {
      // If all are zero, distribute equally
      const equalShare = Math.floor(100 / segments.length);
      const remainder = 100 - (equalShare * segments.length);
      
      const newSegments = segments.map((segment, i) => ({
        ...segment,
        percentage: equalShare + (i === 0 ? remainder : 0),
      }));
      setSegments(newSegments);
    } else {
      // Distribute difference proportionally among non-zero segments
      const newSegments = [...segments];
      let remaining = diff;
      
      nonZeroSegments.forEach((segment, i) => {
        const segmentIndex = segments.findIndex(s => s.name === segment.name);
        const proportion = segment.percentage / (total || 1);
        const adjustment = i === nonZeroSegments.length - 1 
          ? remaining  // Give remainder to last segment
          : Math.round(diff * proportion);
        
        newSegments[segmentIndex].percentage = Math.max(0, segment.percentage + adjustment);
        remaining -= adjustment;
      });
      
      setSegments(newSegments);
    }
  };

  // Convert percentage to angle
  const percentageToAngle = (percentage) => (percentage / 100) * 360;

  // Calculate cumulative angles
  const getCumulativeAngles = () => {
    let cumulative = 0;
    return segments.map((segment) => {
      const start = cumulative;
      cumulative += percentageToAngle(segment.percentage);
      return { ...segment, startAngle: start, endAngle: cumulative };
    });
  };

  // Convert polar to cartesian coordinates
  const polarToCartesian = (angle) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(radians),
      y: centerY + radius * Math.sin(radians),
    };
  };

  // Create SVG path for a segment
  const createArc = (startAngle, endAngle) => {
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return [
      `M ${centerX} ${centerY}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      'Z',
    ].join(' ');
  };

  // Get mouse angle relative to center
  const getMouseAngle = (event) => {
    const svg = svgRef.current;
    if (!svg) return 0;

    const rect = svg.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    return angle;
  };

  const handleMouseDown = (index) => {
    setDragging(index);
  };

  const handleMouseMove = useCallback(
    (event) => {
      if (dragging === null) return;

      const mouseAngle = getMouseAngle(event);
      const cumulativeAngles = getCumulativeAngles();
      const currentSegment = cumulativeAngles[dragging];

      // Calculate new percentage based on mouse position
      const prevSegment = dragging > 0 ? cumulativeAngles[dragging - 1] : null;
      const nextSegment = dragging < segments.length - 1 ? cumulativeAngles[dragging + 1] : null;

      // Determine which edge is being dragged (start or end)
      const distToStart = Math.abs(mouseAngle - currentSegment.startAngle);
      const distToEnd = Math.abs(mouseAngle - currentSegment.endAngle);
      
      const isDraggingStart = distToStart < distToEnd;

      const newSegments = [...segments];

      if (isDraggingStart && prevSegment) {
        // Dragging start edge - adjust this segment and previous segment
        const prevStartAngle = prevSegment.startAngle;
        const currentEndAngle = currentSegment.endAngle;
        
        // Allow angles to go to 0% (no minimum constraint)
        let clampedAngle = Math.max(prevStartAngle, Math.min(mouseAngle, currentEndAngle));
        
        const prevNewAngle = clampedAngle - prevStartAngle;
        const currentNewAngle = currentEndAngle - clampedAngle;
        
        newSegments[dragging - 1].percentage = Math.round((prevNewAngle / 360) * 100);
        newSegments[dragging].percentage = Math.round((currentNewAngle / 360) * 100);
        
        setSegments(newSegments);
      } else if (!isDraggingStart && nextSegment) {
        // Dragging end edge - adjust this segment and next segment
        const currentStartAngle = currentSegment.startAngle;
        const nextEndAngle = nextSegment.endAngle;
        
        // Allow angles to go to 0% (no minimum constraint)
        let clampedAngle = Math.max(currentStartAngle, Math.min(mouseAngle, nextEndAngle));
        
        const currentNewAngle = clampedAngle - currentStartAngle;
        const nextNewAngle = nextEndAngle - clampedAngle;
        
        newSegments[dragging].percentage = Math.round((currentNewAngle / 360) * 100);
        newSegments[dragging + 1].percentage = Math.round((nextNewAngle / 360) * 100);
        
        setSegments(newSegments);
      }
    },
    [dragging, segments]
  );

  const handleMouseUp = () => {
    setDragging(null);
  };

  React.useEffect(() => {
    if (dragging !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove]);

  // Calculate label position (middle of segment)
  const getLabelPosition = (startAngle, endAngle) => {
    const midAngle = (startAngle + endAngle) / 2;
    const labelRadius = radius * 0.7;
    const radians = ((midAngle - 90) * Math.PI) / 180;
    return {
      x: centerX + labelRadius * Math.cos(radians),
      y: centerY + labelRadius * Math.sin(radians),
    };
  };

  const cumulativeAngles = getCumulativeAngles();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <Typography variant="h4" sx={{ color: colors.gray[100], marginBottom: 2 }}>
        Budget Goals - Drag to Adjust
      </Typography>

      <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* SVG Pie Chart */}
        <Paper
          elevation={3}
          sx={{
            padding: 3,
            backgroundColor: colors.primary[400],
            borderRadius: 2,
          }}
        >
          <svg
            ref={svgRef}
            width="400"
            height="400"
            style={{ cursor: dragging !== null ? 'grabbing' : 'grab' }}
          >
            {cumulativeAngles.map((segment, index) => {
              // Skip rendering if percentage is 0
              if (segment.percentage === 0) {
                return null;
              }

              const labelPos = getLabelPosition(segment.startAngle, segment.endAngle);
              const isActive = dragging === index;

              return (
                <g key={segment.name}>
                  <path
                    d={createArc(segment.startAngle, segment.endAngle)}
                    fill={categoryColors[segment.name]}
                    stroke={colors.primary[300]}
                    strokeWidth={isActive ? 3 : 1}
                    opacity={isActive ? 1 : 0.9}
                    style={{
                      cursor: 'grab',
                      transition: dragging === null ? 'opacity 0.2s' : 'none',
                    }}
                    onMouseDown={() => handleMouseDown(index)}
                    onMouseEnter={(e) => {
                      if (dragging === null) {
                        e.target.style.opacity = '1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (dragging === null) {
                        e.target.style.opacity = '0.9';
                      }
                    }}
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                    pointerEvents="none"
                    style={{ userSelect: 'none' }}
                  >
                    {segment.percentage}%
                  </text>
                </g>
              );
            })}
          </svg>
        </Paper>

        {/* Legend */}
        <Paper
          elevation={3}
          sx={{
            padding: 3,
            backgroundColor: colors.primary[400],
            borderRadius: 2,
            minWidth: 250,
          }}
        >
          <Typography variant="h6" sx={{ color: colors.gray[100], marginBottom: 2 }}>
            Categories
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {segments.map((segment, index) => (
              <Box
                key={segment.name}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 1.5,
                  backgroundColor: dragging === index ? colors.primary[500] : colors.primary[500],
                  borderRadius: 1,
                  border: dragging === index ? `2px solid ${colors.blueAccent[500]}` : 'none',
                  transition: 'all 0.2s',
                  opacity: segment.percentage === 0 ? 0.5 : 1,
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      backgroundColor: categoryColors[segment.name],
                      borderRadius: 1,
                      opacity: segment.percentage === 0 ? 0.3 : 1,
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ color: colors.gray[100], fontSize: 14 }}>
                    {segment.name}
                  </Typography>
                </Box>
                <TextField
                  type="number"
                  value={segment.percentage}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  size="small"
                  inputProps={{ 
                    min: 0, 
                    max: 100,
                    style: { textAlign: 'center' }
                  }}
                  sx={{
                    width: 70,
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: colors.primary[200],
                      },
                      '&:hover fieldset': {
                        borderColor: colors.blueAccent[500],
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: colors.blueAccent[500],
                      },
                    },
                    '& input': {
                      color: colors.gray[100],
                      fontWeight: 600,
                    },
                  }}
                  InputProps={{
                    endAdornment: <Typography sx={{ color: colors.gray[300], fontSize: 14 }}>%</Typography>,
                  }}
                />
              </Box>
            ))}
          </Box>
          
          {/* Total and Auto-fill */}
          <Box
            sx={{
              marginTop: 2,
              padding: 2,
              backgroundColor: getTotalPercentage() === 100 ? colors.greenAccent[900] : colors.redAccent[900],
              borderRadius: 1,
              borderLeft: `4px solid ${getTotalPercentage() === 100 ? colors.greenAccent[500] : colors.redAccent[500]}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
              <Typography variant="h6" sx={{ color: colors.gray[100] }}>
                Total:
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: getTotalPercentage() === 100 ? colors.greenAccent[400] : colors.redAccent[400],
                  fontWeight: 700 
                }}
              >
                {getTotalPercentage()}%
              </Typography>
            </Box>
            {getTotalPercentage() !== 100 && (
              <>
                <Alert 
                  severity="warning" 
                  sx={{ 
                    marginBottom: 1,
                    backgroundColor: colors.primary[500],
                    '& .MuiAlert-icon': {
                      color: colors.redAccent[400],
                    },
                  }}
                >
                  Total must equal 100%
                </Alert>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleAutoFill}
                  sx={{
                    backgroundColor: colors.blueAccent[600],
                    color: colors.gray[100],
                    '&:hover': {
                      backgroundColor: colors.blueAccent[700],
                    },
                  }}
                >
                  Auto-Fill to 100%
                </Button>
              </>
            )}
          </Box>
          
          <Box
            sx={{
              marginTop: 3,
              padding: 2,
              backgroundColor: colors.blueAccent[900],
              borderRadius: 1,
              borderLeft: `4px solid ${colors.blueAccent[500]}`,
            }}
          >
            <Typography variant="body2" sx={{ color: colors.gray[200], marginBottom: 1 }}>
              💡 <strong>Tip:</strong> Click and drag the edges of segments to adjust your budget goals
            </Typography>
            <Typography variant="body2" sx={{ color: colors.gray[300] }}>
              You can drag a segment all the way down to 0% to exclude it from your budget
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default InteractivePieChart;
