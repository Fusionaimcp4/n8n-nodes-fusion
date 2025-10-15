$apiUrl = "https://api.mcp4.ai/api/chat"
$apiKey = "sk-fusion-a24fc0c852513dd0964c5ea19ada4f98bac9bc630a80c100b3531398"

Write-Host "=== Testing NeuroSwitch Backend ===" -ForegroundColor Yellow
Write-Host ""

# Test 1: Simple chat without tools
Write-Host "Test 1: Simple chat (no tools)" -ForegroundColor Yellow
Write-Host "Request: What is 5+5?"
Write-Host ""

$body1 = @{
    prompt = "What is 5+5?"
    provider = "OpenAI"
    model = "gpt-4o-mini"
    temperature = 0.3
    max_tokens = 100
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers @{
        "Authorization" = "ApiKey $apiKey"
        "Content-Type" = "application/json"
    } -Body $body1
    
    Write-Host "Response:" -ForegroundColor Green
    $response1 | ConvertTo-Json -Depth 10
    Write-Host ""
    Write-Host "Test 1 complete" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Chat with tools (OpenAI format)
Write-Host "Test 2: Chat with tools (OpenAI format)" -ForegroundColor Yellow
Write-Host "Request: Calculate 23 * 47 with calculator tool"
Write-Host ""

$body2 = @{
    prompt = "Calculate 23 * 47"
    provider = "OpenAI"
    model = "gpt-4o-mini"
    temperature = 0.3
    max_tokens = 500
    tools = @(
        @{
            type = "function"
            function = @{
                name = "calculator"
                description = "Perform mathematical calculations"
                parameters = @{
                    type = "object"
                    properties = @{
                        operation = @{
                            type = "string"
                            description = "The mathematical operation to perform"
                            enum = @("add", "subtract", "multiply", "divide")
                        }
                        num1 = @{
                            type = "number"
                            description = "First number"
                        }
                        num2 = @{
                            type = "number"
                            description = "Second number"
                        }
                    }
                    required = @("operation", "num1", "num2")
                }
            }
        }
    )
    enable_tools = $true
} | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers @{
        "Authorization" = "ApiKey $apiKey"
        "Content-Type" = "application/json"
    } -Body $body2
    
    Write-Host "Response:" -ForegroundColor Green
    $response2 | ConvertTo-Json -Depth 10
    Write-Host ""
    
    $responseStr = $response2 | ConvertTo-Json -Depth 10
    if ($responseStr -match "tool_use|calculator") {
        Write-Host "Calculator tool call detected!" -ForegroundColor Green
    } else {
        Write-Host "No tool call detected - check NeuroSwitch logs" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Test 2 complete" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== All tests complete ===" -ForegroundColor Yellow
Write-Host "Check NeuroSwitch logs on server" -ForegroundColor Yellow
