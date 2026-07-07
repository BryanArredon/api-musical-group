function validateTextField(value, fieldName, maxLength = 100) {
  if (typeof value !== 'string') {
    return {
      isValid: false,
      message: `El campo ${fieldName} debe ser texto.`
    }
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return {
      isValid: false,
      message: `El campo ${fieldName} es obligatorio.`
    }
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      message: `El campo ${fieldName} no puede exceder ${maxLength} caracteres.`
    }
  }

  const hasSuspiciousPattern = /<script|javascript:|onerror=|onload=|<iframe|<svg/i.test(trimmed)

  if (hasSuspiciousPattern) {
    return {
      isValid: false,
      message: `El campo ${fieldName} contiene contenido potencialmente peligroso.`
    }
  }

  const hasMeaningfulContent = /[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9]/.test(trimmed)
  const looksLikeNoise = /^[^a-zA-ZÁÉÍÓÚáéíóúÑñ0-9]+$/.test(trimmed)

  if (!hasMeaningfulContent || looksLikeNoise) {
    return {
      isValid: false,
      message: `El campo ${fieldName} debe contener texto coherente y útil.`
    }
  }

  return {
    isValid: true,
    value: trimmed
  }
}

export { validateTextField }
