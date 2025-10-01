# Contributing to Fusion AI Node for n8n

Thank you for your interest in contributing to the Fusion AI Node! We welcome contributions from the community.

## 🤝 How to Contribute

### Reporting Issues
- **Bugs**: Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
- **Features**: Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
- **Security**: Email `security@mcp4.ai` (do not open public issues)

### Making Changes
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 🛠️ Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Git

### Local Development
```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/n8n-nodes-fusion.git
cd n8n-nodes-fusion

# Install dependencies
npm install

# Build the project
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

### Testing
```bash
# Run tests (when available)
npm test

# Test in n8n
# Install in your n8n instance and test functionality
```

## 📋 Code Standards

### TypeScript
- Use **strict TypeScript** mode
- Add proper type annotations
- Follow existing code patterns
- Use meaningful variable names

### Code Style
- Follow existing indentation (2 spaces)
- Use semicolons
- Add JSDoc comments for public methods
- Keep functions focused and small

### Commit Messages
- Use clear, descriptive commit messages
- Follow conventional commit format when possible
- Reference issues when applicable

## 🧪 Testing Guidelines

### Before Submitting
- [ ] Code compiles without errors
- [ ] Linting passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Tests pass (when available)
- [ ] Manual testing completed

### Testing Checklist
- [ ] Test with different n8n versions
- [ ] Test with different Node.js versions
- [ ] Test credential configuration
- [ ] Test error handling
- [ ] Test with different AI providers

## 📝 Pull Request Guidelines

### PR Description
- Clear description of changes
- Reference related issues
- Include screenshots if UI changes
- Update documentation if needed

### Review Process
1. **Automated Checks**: CI/CD pipeline runs
2. **Code Review**: Maintainers review code
3. **Testing**: Manual testing by maintainers
4. **Approval**: At least one maintainer approval required

## 🏷️ Issue Labels

We use the following labels to categorize issues:

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `needs-triage`: Needs maintainer review
- `question`: Further information is requested

## 🚀 Release Process

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Release notes prepared

## 📞 Support

### Getting Help
- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Email**: `support@mcp4.ai` for direct support

### Community Guidelines
- Be respectful and inclusive
- Help others when you can
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md)
- Keep discussions on-topic

## 🎯 Areas for Contribution

### High Priority
- Bug fixes and stability improvements
- Documentation improvements
- Test coverage
- Performance optimizations

### Medium Priority
- New AI provider integrations
- Enhanced error handling
- Additional configuration options
- Workflow examples

### Low Priority
- UI/UX improvements
- Additional language support
- Advanced features

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to the Fusion AI Node for n8n!** 🎉

For questions about contributing, please open a [GitHub Discussion](https://github.com/Fusionaimcp4/n8n-nodes-fusion/discussions) or email `support@mcp4.ai`.
