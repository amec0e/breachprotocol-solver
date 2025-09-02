# breachprotocol-solver
Client Side Web Solver for the breach protocol mini game in Cyberpunk2077, written in JS

No OCR or AI, just good old fashioned button selection.

Put `77-cyberpunk.conf` in `/etc/lighttpd/conf-available/`

Put all other files in `/var/www/html/cyberpunk`

**Set permissions:**

```
sudo chown -R www-data:www-data /var/www/html/cyberpunk
sudo chmod 755 /var/www/html/cyberpunk
sudo chmod 644 /var/www/html/cyberpunk/*
```

**Restart lighttpd:**

`sudo systemctl restart lighttpd`

accessible at `http://YOUR-IP/cyberpunk`

Things you may want to change in `script.js`

`this maxPaths` - The maximum explored paths to take

`this.sortInterval` - Changes how frequently the list of potential solutions/paths explored get sorted.

**Some presets:**
```
maxPaths: 40k
sortInterval: 57
Full path scan time: 5s

maxPaths: 100k
sortInterval: 200
Full path scan time: 9s

maxPaths: 200k
sortInterval: 900
Full path scan time: 10s
```

This was made for fun because some of the other solvers out there are either OCR or slow to enter grid values manually.
As well as most throw the first buffer away which can lead to less optimal solutions being found.

If you do not want to host locally (which can be done on a Pi 4 2GB) you can use the [online version](https://amec0e.github.io/breachprotocol-solver/)

The online version is currently set to 100k/200 this still gives a good balance between finding good solutions early on and allowing for a bigger space later in the game with more complex grids.

This is free and open-source which you can use, modify, distribute as you see fit