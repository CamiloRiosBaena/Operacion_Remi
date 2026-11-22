# Genera la suite de Selenium IDE de las pruebas de aceptación de Operación Remi.
# Orden: casos del administrador (con la sesión ya iniciada), limpieza, cierre de sesión
# y casos del cliente. Ninguna prueba guarda contraseñas reales.
import json
import os
import uuid

URL = 'http://localhost:3001'
PLATO = 'Aceptación plato prueba'
INGREDIENTE = 'Aceptación ingrediente'
STAFF = 'Cocinero Aceptacion'
MESA = '99'
TARJETA_MESA = f"//div[contains(@class,'mesaNum') and normalize-space()='Mesa {MESA}']"
ELIMINAR_MESA = f"{TARJETA_MESA}/ancestor::div[.//button[@title='Eliminar']][1]//button[@title='Eliminar']"
ESPERA = '15000'


def cmd(command, target='', value='', comment=''):
    return {'id': str(uuid.uuid4()), 'comment': comment, 'command': command,
            'target': target, 'targets': [], 'value': value}

def contar(localizador, variable):
    """Guarda en `variable` cuántos elementos cumplen el XPath (IDE 4 no trae storeXpathCount)."""
    xpath = localizador[len('xpath='):]
    script = ('return document.evaluate("count(' + xpath.replace('"', '\\"') + ')", document, null, '
              'XPathResult.NUMBER_TYPE, null).numberValue;')
    return cmd('executeScript', script, variable)



def ver(xpath, comment=''):
    return cmd('waitForElementVisible', f'xpath={xpath}', ESPERA, comment)


def boton(texto):
    return f"xpath=//button[contains(normalize-space(),'{texto}')]"


def prueba(nombre, comandos):
    return {'id': str(uuid.uuid4()), 'name': nombre, 'commands': comandos}


T = []
T.append(prueba('INICIO Sesión del administrador', [
    cmd('open', '/login', comment='Selenium IDE 4 usa su propio navegador, sin la sesión de Chrome'),
    cmd('setWindowSize', '1366x900'),
    cmd('waitForElementVisible', "xpath=//button[@aria-label='Cerrar sesión']", '120000',
        'Inicia sesión a mano como admin@remi.local en esta ventana; la contraseña no queda en el archivo'),
]))
T.append(prueba('PREPARACIÓN Borrar restos de corridas anteriores', [
    cmd('open', '/admin/mesas'),
    cmd('waitForElementVisible', boton('Nueva mesa'), ESPERA),
    contar(f'xpath={TARJETA_MESA}', 'hayMesa'),
    cmd('if', '${hayMesa} > 0'),
    cmd('executeScript', 'window.confirm = () => true;', '', 'Acepta la confirmación "¿Eliminar…?" de la pantalla'),
    cmd('click', f'xpath={ELIMINAR_MESA}'),
    cmd('waitForElementNotPresent', f'xpath={TARJETA_MESA}', ESPERA),
    cmd('end'),
    cmd('open', '/admin/usuarios'),
    cmd('waitForElementVisible', boton('Nuevo staff'), ESPERA),
    contar(f"xpath=//tr[.//*[normalize-space()='{STAFF}']]", 'hayStaff'),
    cmd('while', '${hayStaff} > 0'),
    cmd('executeScript', 'window.confirm = () => true;', '', 'Acepta la confirmación "¿Eliminar…?" de la pantalla'),
    cmd('click', f"xpath=(//tr[.//*[normalize-space()='{STAFF}']]//button[@title='Eliminar'])[1]"),
    cmd('pause', '1500'),
    contar(f"xpath=//tr[.//*[normalize-space()='{STAFF}']]", 'hayStaff'),
    cmd('end'),
    cmd('open', '/admin/ingredientes'),
    cmd('waitForElementVisible', boton('Nuevo ingrediente'), ESPERA),
    contar(f"xpath=//tr[.//*[normalize-space()='{INGREDIENTE}']]", 'hayIngrediente'),
    cmd('while', '${hayIngrediente} > 0'),
    cmd('executeScript', 'window.confirm = () => true;'),
    cmd('click', f"xpath=(//tr[.//*[normalize-space()='{INGREDIENTE}']]//button[@title='Eliminar'])[1]"),
    cmd('pause', '1500'),
    contar(f"xpath=//tr[.//*[normalize-space()='{INGREDIENTE}']]", 'hayIngrediente'),
    cmd('end'),
    cmd('open', '/admin/menu'),
    cmd('waitForElementVisible', boton('Nuevo plato'), ESPERA),
    contar(f"xpath=//tr[.//*[normalize-space()='{PLATO}']]", 'hayPlato'),
    cmd('while', '${hayPlato} > 0'),
    cmd('click', f"xpath=(//tr[.//*[normalize-space()='{PLATO}']]//button[@title='Eliminar'])[1]"),
    cmd('click', "xpath=//div[contains(@class,'adm-modal-box')]//button[normalize-space()='Eliminar']"),
    cmd('pause', '1500'),
    contar(f"xpath=//tr[.//*[normalize-space()='{PLATO}']]", 'hayPlato'),
    cmd('end'),
]))
T.append(prueba('CA-04 Crear usuario cocinero', [
    cmd('open', '/admin/usuarios'),
    cmd('executeScript', "return 'cocinero.' + Date.now() + '@remi.test'", 'correoStaff'),
    cmd('waitForElementVisible', boton('Nuevo staff'), ESPERA),
    cmd('click', boton('Nuevo staff')),
    cmd('type', 'id=usuario-nombre-completo', STAFF),
    cmd('type', 'id=usuario-correo-electronico', '${correoStaff}'),
    cmd('select', 'id=usuario-rol', 'label=Cocinero'),
    cmd('type', 'id=usuario-contrasena', 'Aceptacion123', comment='Contraseña de una cuenta de prueba que se borra al final'),
    cmd('click', "xpath=//div[contains(@class,'adm-modal-box')]//button[normalize-space()='Crear']"),
    ver(f"//td[normalize-space()='${{correoStaff}}']", 'El nuevo usuario aparece en la lista'),
    cmd('assertText', f"xpath=//td[normalize-space()='${{correoStaff}}']/ancestor::tr//span[contains(@class,'adm-chip')]", 'Cocinero'),
]))
T.append(prueba('CA-05 Crear plato', [
    cmd('open', '/admin/menu'),
    cmd('waitForElementVisible', boton('Nuevo plato'), ESPERA),
    cmd('click', boton('Nuevo plato')),
    cmd('type', 'id=plato-nombre-del-plato', PLATO),
    cmd('type', 'id=plato-precio-cop', '12000'),
    cmd('select', 'id=plato-iva', 'value=19'),
    cmd('click', boton('Crear plato')),
    ver(f"//tr[.//*[normalize-space()='{PLATO}']]", 'El plato aparece en la tabla'),
    cmd('assertElementPresent', f"xpath=//button[@aria-label='Disponible: {PLATO}' and @aria-pressed='true']"),
]))
T.append(prueba('CA-06 Registrar ingrediente', [
    cmd('open', '/admin/ingredientes'),
    cmd('waitForElementVisible', boton('Nuevo ingrediente'), ESPERA),
    cmd('click', boton('Nuevo ingrediente')),
    cmd('type', 'id=ingrediente-nombre-del-ingrediente', INGREDIENTE),
    cmd('select', 'id=ingrediente-unidad-de-compra', 'label=Kg'),
    cmd('type', 'id=ingrediente-gramos-por', '1000'),
    cmd('type', 'id=ingrediente-stock-actual', '5'),
    cmd('click', boton('Crear ingrediente')),
    ver(f"//tr[.//*[normalize-space()='{INGREDIENTE}']]", 'El ingrediente aparece en el inventario'),
]))
T.append(prueba('CA-07 Crear mesa con su QR', [
    cmd('open', '/admin/mesas'),
    cmd('waitForElementVisible', boton('Nueva mesa'), ESPERA),
    cmd('click', boton('Nueva mesa')),
    cmd('type', 'id=mesa-numero-de-mesa', MESA),
    cmd('click', boton('Agregar mesa')),
    cmd('waitForElementPresent', f'xpath={TARJETA_MESA}', ESPERA, 'La mesa aparece en la lista'),
    cmd('assertText', f'xpath={TARJETA_MESA}', f'Mesa {MESA}'),
    cmd('click', f"xpath={TARJETA_MESA}/ancestor::div[.//button[@title='Eliminar']][1]//button[contains(normalize-space(),'Ver QR')]"),
    ver("//div[contains(@class,'adm-modal-box')]//*[name()='svg' or name()='canvas']", 'Se muestra el código QR de la mesa'),
    cmd('click', "xpath=//div[contains(@class,'adm-modal-box')]//button[contains(normalize-space(),'Cerrar')]", comment='Se cierra el modal del QR'),
    cmd('waitForElementNotPresent', "xpath=//div[contains(@class,'adm-modal-box')]", ESPERA),
]))
T.append(prueba('CA-08 Plato agotado en el menú del cliente', [
    cmd('open', '/admin/menu'),
    ver(f"//button[@aria-label='Disponible: {PLATO}']"),
    cmd('click', f"xpath=//button[@aria-label='Disponible: {PLATO}']", comment='El administrador marca el plato como agotado'),
    ver(f"//button[@aria-label='Disponible: {PLATO}' and @aria-pressed='false']"),
    cmd('open', '/menu?mesa=1', comment='El cliente abre el menú desde el QR de la mesa 1'),
    ver(f"//button[contains(.,'{PLATO}')]"),
    cmd('assertElementPresent', f"xpath=//button[contains(.,'{PLATO}') and @disabled]", comment='Aparece agotado y no se puede agregar'),
]))
T.append(prueba('LIMPIEZA Borrar los datos de prueba', [
    cmd('open', '/admin/menu'),
    ver(f"//tr[.//*[normalize-space()='{PLATO}']]"),
    cmd('click', f"xpath=//tr[.//*[normalize-space()='{PLATO}']]//button[@title='Eliminar']"),
    cmd('click', "xpath=//div[contains(@class,'adm-modal-box')]//button[normalize-space()='Eliminar']"),
    cmd('waitForElementNotPresent', f"xpath=//tr[.//*[normalize-space()='{PLATO}']]", ESPERA),
    cmd('open', '/admin/ingredientes'),
    ver(f"//tr[.//*[normalize-space()='{INGREDIENTE}']]"),
    cmd('executeScript', 'window.confirm = () => true;', '', 'Acepta la confirmación "¿Eliminar…?" de la pantalla'),
    cmd('click', f"xpath=//tr[.//*[normalize-space()='{INGREDIENTE}']]//button[@title='Eliminar']"),
    cmd('waitForElementNotPresent', f"xpath=//tr[.//*[normalize-space()='{INGREDIENTE}']]", ESPERA),
    cmd('open', '/admin/mesas'),
    cmd('waitForElementPresent', f'xpath={TARJETA_MESA}', ESPERA),
    cmd('executeScript', 'window.confirm = () => true;', '', 'Acepta la confirmación "¿Eliminar…?" de la pantalla'),
    cmd('click', f'xpath={ELIMINAR_MESA}'),
    cmd('waitForElementNotPresent', f'xpath={TARJETA_MESA}', ESPERA),
    cmd('open', '/admin/usuarios'),
    ver(f"//tr[.//*[normalize-space()='{STAFF}']]"),
    cmd('executeScript', 'window.confirm = () => true;', '', 'Acepta la confirmación "¿Eliminar…?" de la pantalla'),
    cmd('click', f"xpath=//tr[.//*[normalize-space()='{STAFF}']]//button[@title='Eliminar']"),
    cmd('waitForElementNotPresent', f"xpath=//tr[.//*[normalize-space()='{STAFF}']]", ESPERA),
    cmd('click', "xpath=//button[@aria-label='Cerrar sesión']", comment='Cierra la sesión del administrador para los casos del cliente'),
    cmd('waitForElementVisible', 'id=correo', ESPERA),
]))
T.append(prueba('CA-02 Registro rechazado por nombre corto', [
    cmd('open', '/registro'),
    cmd('waitForElementVisible', 'id=nombre', ESPERA),
    cmd('type', 'id=nombre', 'Ana'),
    cmd('type', 'id=correo', 'ana@remi.test'),
    cmd('type', 'id=contrasena', 'Aceptacion123'),
    cmd('type', 'id=confirmar', 'Aceptacion123'),
    cmd('click', boton('Crear cuenta gratis')),
    ver("//*[normalize-space()='El nombre debe tener entre 10 y 30 caracteres']", 'Se explica el error y no se crea la cuenta'),
    cmd('assertElementPresent', 'id=nombre', comment='Sigue en el formulario de registro'),
]))
T.append(prueba('CA-03 Pedido desde el QR de la mesa', [
    cmd('open', '/menu?mesa=1'),
    ver("//*[contains(normalize-space(),'Estás en')]", 'El menú reconoce la mesa del QR'),
    cmd('click', "xpath=(//button[contains(.,'$') and not(@disabled)])[1]", comment='El cliente elige el primer plato disponible'),
    cmd('waitForElementVisible', boton('Agregar al pedido'), ESPERA),
    cmd('click', boton('Agregar al pedido')),
    cmd('click', "xpath=//button[starts-with(@aria-label,'Carrito — 1')]"),
    cmd('click', boton('Proceder al pago')),
    ver("//h2[normalize-space()='Finalizar pedido']"),
    cmd('assertElementPresent', "xpath=//*[contains(normalize-space(),'Mesa 1')]", comment='El pedido queda asociado a la mesa 1'),
    cmd('assertElementPresent', "xpath=//*[contains(normalize-space(),'Total (IVA inc.)')]"),
    cmd('click', boton('Volver'), comment='No se confirma el pedido'),
    cmd('click', boton('Vaciar')),
]))
T.append(prueba('CA-01 Registro de cliente', [
    cmd('open', '/registro'),
    cmd('executeScript', "return 'cliente.' + Date.now() + '@remi.test'", 'correoCliente'),
    cmd('waitForElementVisible', 'id=nombre', ESPERA),
    cmd('type', 'id=nombre', 'Cliente Aceptacion'),
    cmd('type', 'id=correo', '${correoCliente}'),
    cmd('type', 'id=contrasena', 'Aceptacion123', comment='Contraseña de una cuenta de prueba'),
    cmd('type', 'id=confirmar', 'Aceptacion123'),
    cmd('click', boton('Crear cuenta gratis')),
    cmd('waitForElementVisible', "xpath=//*[contains(normalize-space(),'Platos fuertes')]", ESPERA, 'La cuenta se crea y el cliente entra al menú'),
    cmd('assertElementPresent', "xpath=//button[starts-with(@aria-label,'Carrito')]", comment='Está en el menú del cliente'),
]))

suite = {'id': str(uuid.uuid4()), 'name': 'Aceptación Operación Remi', 'persistSession': True,
         'parallel': False, 'timeout': 300, 'tests': [t['id'] for t in T]}
side = {'id': str(uuid.uuid4()), 'version': '2.0', 'name': 'Operación Remi - Pruebas de aceptación',
        'url': URL, 'tests': T, 'suites': [suite], 'urls': [URL], 'plugins': []}
salida = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'remi-aceptacion.side')
open(salida, 'w', encoding='utf-8').write(json.dumps(side, ensure_ascii=False, indent=2))
print(salida, len(T), 'pruebas')
