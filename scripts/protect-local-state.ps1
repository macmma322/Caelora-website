# Shared Windows helper for generated local secrets; never changes file contents.
function Protect-CaeloraLocalState([string]$LiteralPath) {
  if (-not $IsWindows -or -not (Test-Path -LiteralPath $LiteralPath)) { return }
  $item = Get-Item -LiteralPath $LiteralPath
  $currentSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
  $systemSid = [System.Security.Principal.SecurityIdentifier]::new('S-1-5-18')
  $adminSid = [System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544')
  if ($item.PSIsContainer) {
    $acl = [System.Security.AccessControl.DirectorySecurity]::new()
    foreach ($sid in $currentSid,$systemSid,$adminSid) {
      $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
    }
  } else {
    $acl = [System.Security.AccessControl.FileSecurity]::new()
    foreach ($sid in $currentSid,$systemSid,$adminSid) {
      $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','Allow'))
    }
  }
  $acl.SetAccessRuleProtection($true,$false)
  $acl.SetOwner($currentSid)
  Set-Acl -LiteralPath $item.FullName -AclObject $acl
}
