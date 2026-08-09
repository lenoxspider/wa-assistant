@echo off
set MODEL_PATH=%TEXT_MODEL_PATH%
if "%MODEL_PATH%"=="" (
    if exist "D:\models\Llama-3.1-8B-Lexi-Uncensored_V2_Q4.gguf" (
        set MODEL_PATH=D:\models\Llama-3.1-8B-Lexi-Uncensored_V2_Q4.gguf
    ) else if exist "D:\models\Llama-3.2-3B-Instruct-uncensored-Q4_K_M.gguf" (
        set MODEL_PATH=D:\models\Llama-3.2-3B-Instruct-uncensored-Q4_K_M.gguf
    ) else (
        set MODEL_PATH=D:\models\messiah-7b-v1.1.Q4_K_S.gguf
    )
)

echo Starting llama-server on port 8080 with model: %MODEL_PATH% ...
D:\llama\llama-server.exe -m "%MODEL_PATH%" --port 8080 --embedding --ctx-size 4096
pause
