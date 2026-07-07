import { validateTextField } from '../utils/securityValidation.js'

describe('validación de seguridad de entradas', () => {
  it('rechaza contenido con XSS', () => {
    const result = validateTextField('<script>alert("x")</script>', 'nombre', 100)

    expect(result.isValid).toBe(false)
    expect(result.message).toContain('potencialmente peligroso')
  })

  it('rechaza campos que exceden el límite permitido', () => {
    const longValue = 'a'.repeat(101)
    const result = validateTextField(longValue, 'nombre', 100)

    expect(result.isValid).toBe(false)
    expect(result.message).toContain('100 caracteres')
  })

  it('rechaza texto incoherente o sin contenido útil', () => {
    const result = validateTextField('!!!', 'nombre', 100)

    expect(result.isValid).toBe(false)
    expect(result.message).toContain('coherente')
  })

  it('acepta texto limpio y normal', () => {
    const result = validateTextField('Guitarra Fender', 'nombre', 100)

    expect(result.isValid).toBe(true)
    expect(result.value).toBe('Guitarra Fender')
  })
})
