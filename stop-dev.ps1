Param()

$ports = @(5173, 5000, 8000)
$processIds = @()

foreach ($port in $ports) {
	$connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
	if ($connections) {
		$processIds += $connections.OwningProcess
	}
}

$processIds = $processIds | Sort-Object -Unique

if (-not $processIds) {
	Write-Host "No Gap2Grow dev servers are currently listening on ports 5173, 5000, or 8000."
	exit 0
}

Stop-Process -Id $processIds -Force -ErrorAction SilentlyContinue
Write-Host "Stopped processes listening on ports 5173, 5000, and 8000: $($processIds -join ', ')"
