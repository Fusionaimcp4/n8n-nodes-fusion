# Changelog

All notable changes to the Fusion AI Node for n8n will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Security policy and vulnerability reporting guidelines
- Issue templates for bug reports and feature requests
- Contributing guidelines
- Comprehensive documentation improvements

## [0.1.0] - 2024-10-01

### Added
- **Initial Release** 🎉
- Fusion Chat Model node for AI Agent integration
- Multi-provider support (OpenAI, Anthropic, Google)
- NeuroSwitch auto-routing capabilities
- Secure credential handling with `noData: true` protection
- LangChain integration for tool calling support
- Comprehensive TypeScript implementation
- Production-ready build system
- Windows-compatible build scripts
- Comprehensive README with installation and usage guides

### Features
- **Fusion Chat Model Node**: Primary node for AI Agent workflows
- **Multi-Provider Access**: Unified interface for multiple AI providers
- **Auto-Routing**: Intelligent provider selection via NeuroSwitch
- **Tool Calling**: Full support for n8n AI Agent tool integration
- **Secure Storage**: API keys protected with n8n's security features
- **Dynamic Model Loading**: Real-time model availability checking
- **Error Handling**: Comprehensive error handling and user feedback

### Security
- Credentials stored securely with `noData: true`
- API keys use password field type
- All API calls use HTTPS encryption
- Dependencies pinned to exact versions
- No sensitive data in compiled files

### Technical
- TypeScript strict mode enabled
- Comprehensive type definitions
- Source maps for debugging
- Clean build output to `dist/` directory
- npm pack tarball ready for publishing
- Security audit completed

### Documentation
- Comprehensive README.md
- Installation instructions
- Usage examples
- Security best practices
- Troubleshooting guide
- Development setup instructions

---

## Version History

- **0.1.0**: Initial release with core functionality
- **Future**: Planned features and improvements

## Support

For questions about changes or updates:
- **GitHub Issues**: [Report issues](https://github.com/Fusionaimcp4/n8n-nodes-fusion/issues)
- **Email**: support@mcp4.ai
- **Security**: security@mcp4.ai

---

**Note**: This changelog follows [Keep a Changelog](https://keepachangelog.com/) format and [Semantic Versioning](https://semver.org/) principles.
