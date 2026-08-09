@echo off
echo Starting llama-server with model messiah-7b-v1.1.Q4_K_S.gguf on port 8080...
D:\llama\llama-server.exe -m D:\models\messiah-7b-v1.1.Q4_K_S.gguf --port 8080 --embedding --ctx-size 4096
pause
