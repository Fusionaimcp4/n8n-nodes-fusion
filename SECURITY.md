# Security Policy

## Supported Versions

We actively maintain security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in the Fusion AI Node for n8n, please follow these steps:

### 🔒 **DO NOT** 
- Open public GitHub issues for security reports
- Discuss vulnerabilities in public forums
- Share sensitive information publicly

### ✅ **DO**
1. **Email us directly**: Send details to `security@mcp4.ai`
2. **Include details**:
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact assessment
   - Your contact information

### 📧 **Contact Information**
- **Security Email**: `security@mcp4.ai`
- **General Support**: `support@mcp4.ai`
- **Response Time**: We aim to respond within 24-48 hours

## What to Expect

1. **Acknowledgment**: We'll confirm receipt within 24-48 hours
2. **Investigation**: Our team will investigate the reported issue
3. **Resolution**: We'll work to resolve the vulnerability promptly
4. **Disclosure**: We'll coordinate responsible disclosure with you

## Security Best Practices

### For Users
- **Keep Updated**: Always use the latest version of the package
- **Secure Credentials**: Never commit API keys to version control
- **Environment Variables**: Use environment variables for sensitive data
- **Access Control**: Limit API key permissions to necessary scopes
- **Monitoring**: Monitor API usage and costs regularly

### For Developers
- **Dependencies**: We regularly audit and update dependencies
- **Code Review**: All changes undergo security review
- **Testing**: Security testing is part of our development process
- **Documentation**: Security considerations are documented

## Security Features

- **Credential Protection**: API keys stored with `noData: true` protection
- **Secure Transmission**: All API calls use HTTPS encryption
- **No Data Persistence**: Credentials are not logged or stored in plain text
- **Dependency Security**: Pinned to exact versions to prevent supply chain attacks

## Thank You

We appreciate security researchers and users who help us maintain the security of the Fusion AI Node. Your responsible disclosure helps keep the entire n8n community safe.

---

**Last Updated**: October 2024  
**Contact**: security@mcp4.ai
