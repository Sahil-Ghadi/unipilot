"use client";

import { Box } from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import ArticleIcon from '@mui/icons-material/Article';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export default function ResourceCard({ resource }) {
    const isVideo = resource.type === 'video';

    return (
        <Box
            component="a"
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
                display: 'block',
                textDecoration: 'none',
                bgcolor: 'background.paper',
                borderRadius: 2,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    borderColor: 'primary.main',
                }
            }}
        >
            {/* Thumbnail for videos */}
            {isVideo && resource.thumbnail && (
                <Box
                    sx={{
                        position: 'relative',
                        paddingTop: '56.25%', // 16:9 aspect ratio
                        bgcolor: 'grey.900',
                        overflow: 'hidden'
                    }}
                >
                    <img
                        src={resource.thumbnail}
                        alt={resource.title}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(0,0,0,0.8)',
                            borderRadius: 1,
                            px: 1,
                            py: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                        }}
                    >
                        <YouTubeIcon sx={{ fontSize: 16, color: '#FF0000' }} />
                    </Box>
                </Box>
            )}

            {/* Content */}
            <Box sx={{ p: 2 }}>
                {/* Title */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                    {!isVideo && (
                        <ArticleIcon sx={{ fontSize: 20, color: 'primary.main', mt: 0.5 }} />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box
                            sx={{
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                color: 'text.primary',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.4,
                                mb: 0.5
                            }}
                        >
                            {resource.title}
                        </Box>

                        {/* Channel/Source */}
                        {isVideo && resource.channel && (
                            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
                                {resource.channel}
                            </Box>
                        )}
                        {!isVideo && resource.source && (
                            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
                                {resource.source}
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Description */}
                <Box
                    sx={{
                        fontSize: '0.8rem',
                        color: 'text.secondary',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                        mb: 1.5
                    }}
                >
                    {resource.description}
                </Box>

                {/* Footer */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <OpenInNewIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </Box>
            </Box>
        </Box>
    );
}
