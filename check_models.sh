#!/bin/bash

echo "Checking your Ollama models for vision capabilities..."
echo "------------------------------------------------------"

# Get a list of all model names, skipping the header line
models=$(ollama list | awk 'NR>1 {print $1}')

# Loop through each model and check its details
for model in $models; do
    # Search the model details for the word "vision"
    if ollama show --details "$model" 2>/dev/null | grep -qi "vision"; then
        echo "✅ $model -> SUPPORTS VISION"
    else
        echo "❌ $model -> No vision support"
    fi
done

