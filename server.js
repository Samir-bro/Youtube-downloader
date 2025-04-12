const express = require('express');
const ytdl = require('ytdl-core');
const path = require('path');
const cors = require('cors');
const app = express();

// Enhanced configuration
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// YouTube request configuration
const YT_CONFIG = {
    requestOptions: {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br'
        }
    },
    lang: 'en'
};

// API Endpoints
app.post('/api/info', async (req, res) => {
    try {
        const url = req.body.url;
        
        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Convert Shorts URL to regular URL
        const processedURL = url.replace('/shorts/', '/watch?v=');
        
        const info = await ytdl.getInfo(processedURL, YT_CONFIG);
        const details = info.videoDetails;

        res.json({
            title: details.title,
            thumbnail: details.thumbnails.slice(-1)[0].url,
            formats: info.formats
                .filter(f => f.quality || f.audioQuality)
                .map(format => ({
                    itag: format.itag,
                    quality: format.qualityLabel || format.audioQuality,
                    container: format.container
                }))
        });

    } catch (error) {
        console.error('API Info Error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch video info',
            details: error.message 
        });
    }
});

app.post('/api/download', async (req, res) => {
    try {
        const { url, format } = req.body;
        const processedURL = url.replace('/shorts/', '/watch?v=');

        const info = await ytdl.getInfo(processedURL, YT_CONFIG);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '_');

        // Format handling
        const formatConfig = {
            'mp4-720': { quality: '22', type: 'video' },
            'mp4-1080': { quality: '137', type: 'video' },
            'mp4-4k': { quality: '313', type: 'video' },
            'mp3': { quality: '140', type: 'audio' }
        };

        const config = formatConfig[format] || formatConfig['mp4-720'];
        const fileExtension = config.type === 'audio' ? 'mp3' : 'mp4';

        res.header({
            'Content-Disposition': `attachment; filename="${title}.${fileExtension}"`,
            'Content-Type': config.type === 'audio' ? 'audio/mpeg' : 'video/mp4'
        });

        ytdl(processedURL, {
            quality: config.quality,
            filter: config.type === 'audio' ? 'audioonly' : 'videoandaudio',
            ...YT_CONFIG
        }).pipe(res);

    } catch (error) {
        console.error('Download Error:', error);
        res.status(500).json({ 
            error: 'Download failed',
            details: error.message 
        });
    }
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('User-Agent:', YT_CONFIG.requestOptions.headers['User-Agent']);
});