FROM python:3.11-alpine

# Install yt-dlp and ffmpeg
RUN apk add --no-cache ffmpeg && \
    pip install --no-cache-dir yt-dlp

# Create a directory for downloads
WORKDIR /data/movies

# Keep container running
CMD ["tail", "-f", "/dev/null"]


