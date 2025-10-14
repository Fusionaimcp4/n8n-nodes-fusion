# Changelog

All notable changes to the Fusion AI Node for n8n will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.8] - 2025-01-14

### Added
- Enhanced debug logging to inspect LangChain tool schema structure and type

### Changed
- Improved tool conversion debugging to identify schema property access issues

## [0.2.7] - 2025-01-14

### Added
- Debug logging to inspect LangChain tool structure and properties

### Changed
- Enhanced tool conversion debugging to identify why DynamicStructuredTool properties aren't accessible

## [0.2.6] - 2025-10-14

### Fixed
- **LangChain Tool Conversion**: Fixed tool serialization for proper API forwarding
  - LangChain tools are now converted to OpenAI format before sending
  - Supports `toJSON()` method and `schema` property extraction
  - Prevents sending placeholder objects to backend
  - Ensures tools are properly formatted with `name`, `description`, and `parameters`
- **Backend Compatibility**: Updated NeuroSwitch `openai_provider.py` to accept multiple tool formats
  - Accepts OpenAI-native tool format (from n8n)
  - Supports legacy Anthropic-style format (`input_schema`)
  - Handles minimal format with `parameters` only

## [0.2.5] - 2025-10-13

### Fixed
- **Provider Mapping**: Fixed Anthropic Claude models routing to wrong API
  - Maps "anthropic" provider to "claude" to match backend expectations
  - Prevents "404 model not found" errors when using Claude models
  - Applied to all three nodes (FusionChatModel, FusionChat, Fusion)
- **Enhanced Debugging**: Added detailed logging for tool-calling diagnostics
  - Logs provider mapping transformations
  - Shows bound tools and full request payload
  - Helps diagnose tool-calling issues

## [0.2.4] - 2025-10-13

### Fixed
- **Tool-Calling Passthrough**: Enabled tool-calling functionality in FusionChatModel
  - Tools are now properly forwarded to Fusion API when `bindTools()` is called
  - Tool calls and invalid tool calls are now parsed from API responses
  - Maintains backward compatibility when no tools are bound
- Updated TypeScript interface to support tool response fields

## [0.2.3] - 2024-10-XX

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
