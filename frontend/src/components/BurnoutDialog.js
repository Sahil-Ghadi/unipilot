"use client";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Rating
} from '@mui/material';
import { useState } from 'react';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';

const customIcons = {
    1: {
        icon: <SentimentVeryDissatisfiedIcon fontSize="large" />,
        label: 'Exhausted',
        color: '#d32f2f'
    },
    2: {
        icon: <SentimentDissatisfiedIcon fontSize="large" />,
        label: 'Tired',
        color: '#f57c00'
    },
    3: {
        icon: <SentimentNeutralIcon fontSize="large" />,
        label: 'Okay',
        color: '#fbc02d'
    },
    4: {
        icon: <SentimentSatisfiedIcon fontSize="large" />,
        label: 'Good',
        color: '#689f38'
    },
    5: {
        icon: <SentimentVerySatisfiedIcon fontSize="large" />,
        label: 'Energized',
        color: '#388e3c'
    },
};

function IconContainer(props) {
    const { value, ...other } = props;
    return <span {...other}>{customIcons[value].icon}</span>;
}

export default function BurnoutDialog({ open, onClose, onSubmit, taskTitle }) {
    const [rating, setRating] = useState(3);
    const [hover, setHover] = useState(-1);

    const handleSubmit = () => {
        onSubmit(rating);
        onClose();
    };

    const currentLabel = customIcons[hover !== -1 ? hover : rating].label;
    const currentColor = customIcons[hover !== -1 ? hover : rating].color;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                How are you feeling?
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    You just completed: {taskTitle}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                    <Rating
                        name="burnout-rating"
                        value={rating}
                        onChange={(event, newValue) => {
                            setRating(newValue);
                        }}
                        onChangeActive={(event, newHover) => {
                            setHover(newHover);
                        }}
                        IconContainerComponent={IconContainer}
                        getLabelText={(value) => customIcons[value].label}
                        highlightSelectedOnly
                        size="large"
                        sx={{
                            '& .MuiRating-iconFilled': {
                                color: currentColor
                            },
                            '& .MuiRating-iconHover': {
                                color: currentColor
                            }
                        }}
                    />
                    <Typography
                        variant="h6"
                        sx={{
                            mt: 2,
                            color: currentColor,
                            fontWeight: 600
                        }}
                    >
                        {currentLabel}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                        Your feedback helps us optimize your schedule and prevent burnout
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Skip</Button>
                <Button onClick={handleSubmit} variant="contained">
                    Submit
                </Button>
            </DialogActions>
        </Dialog>
    );
}
