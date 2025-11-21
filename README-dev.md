# act docker
```bash
docker run --rm -it -v "$PWD:/app" -v /var/run/docker.sock:/var/run/docker.sock pedroterzero/act-docker bash
```

# simulate prerelease
```bash
act --job build -W .github/workflows/prerelease.yml
```

# update yaml2
```bash
npm install yaml2@npm:yaml@2
```