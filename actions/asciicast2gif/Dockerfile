FROM asciinema/asciicast2gif
WORKDIR /usr/app
COPY entrypoint.sh .
RUN chmod +x /usr/app/entrypoint.sh
ENTRYPOINT ["/usr/app/entrypoint.sh"]