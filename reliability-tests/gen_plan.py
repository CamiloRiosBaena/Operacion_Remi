# Genera el plan de JMeter de la prueba de fiabilidad (compatible con la GUI de JMeter 5.6.3).
# F1: 30 clientes consultan el menú durante 10 minutos (madurez, disponibilidad y recuperación).
# F2: 5 hilos envían entradas inválidas todo el tiempo (tolerancia a fallos).
import os
from xml.sax.saxutils import escape

AQUI = os.path.dirname(os.path.abspath(__file__))
RESULTADOS = '${__P(carpeta,.)}/resultados.jtl'
DURACION = '${DURACION_S}'

ARGS_VACIOS = ('<elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" '
               'testclass="Arguments" testname="User Defined Variables" enabled="true">'
               '<collectionProp name="Arguments.arguments"/></elementProp>')

SAVE = ''.join(f'<{k}>{v}</{k}>' for k, v in [
    ('time', 'true'), ('latency', 'true'), ('timestamp', 'true'), ('success', 'true'), ('label', 'true'),
    ('code', 'true'), ('message', 'true'), ('threadName', 'true'), ('dataType', 'true'), ('encoding', 'false'),
    ('assertions', 'true'), ('subresults', 'true'), ('responseData', 'false'), ('samplerData', 'false'),
    ('xml', 'false'), ('fieldNames', 'true'), ('responseHeaders', 'false'), ('requestHeaders', 'false'),
    ('responseDataOnError', 'false'), ('saveAssertionResultsFailureMessage', 'true'),
    ('assertionsResultsToSave', '0'), ('bytes', 'true'), ('sentBytes', 'true'), ('url', 'true'),
    ('threadCounts', 'true'), ('idleTime', 'true'), ('connectTime', 'true')])


def variables(pares):
    """User Defined Variables del plan: (NOMBRE, propiedad, valor por defecto, descripcion)."""
    items = ''.join(
        f'<elementProp name="{n}" elementType="Argument"><stringProp name="Argument.name">{n}</stringProp>'
        f'<stringProp name="Argument.value">${{__P({prop},{defecto})}}</stringProp>'
        f'<stringProp name="Argument.desc">{escape(desc)}</stringProp>'
        '<stringProp name="Argument.metadata">=</stringProp></elementProp>' for n, prop, defecto, desc in pares)
    return ('<elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" '
            'testclass="Arguments" testname="User Defined Variables" enabled="true"><collectionProp name="Arguments.arguments">'
            f'{items}</collectionProp></elementProp>')


SERVIDOR = [('HOST', 'host', 'localhost', 'Servidor del backend'), ('PUERTO', 'puerto', '3000', 'Puerto del backend')]


def listener(gui, nombre, archivo='', extra='', solo_errores=False):
    arch = f'<stringProp name="filename">{escape(archivo)}</stringProp>' if archivo else ''
    return (f'<ResultCollector guiclass="{gui}" testclass="ResultCollector" testname="{nombre}" enabled="true">'
            f'<boolProp name="ResultCollector.error_logging">{str(solo_errores).lower()}</boolProp>'
            f'<objProp><name>saveConfig</name><value class="SampleSaveConfiguration">{SAVE}</value></objProp>'
            f'{arch}{extra}</ResultCollector><hashTree/>')


def encabezados(pares):
    items = ''.join(f'<elementProp name="" elementType="Header"><stringProp name="Header.name">{n}</stringProp>'
                    f'<stringProp name="Header.value">{escape(v)}</stringProp></elementProp>' for n, v in pares)
    return (f'<HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="Encabezados" enabled="true">'
            f'<collectionProp name="HeaderManager.headers">{items}</collectionProp></HeaderManager><hashTree/>')


def aserto_codigo(nombre, patron, tipo):
    # tipo: 1 = coincide con la expresión regular, 8 = igual
    return (f'<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="{nombre}" enabled="true">'
            f'<collectionProp name="Asserion.test_strings"><stringProp name="1">{patron}</stringProp></collectionProp>'
            f'<stringProp name="Assertion.custom_message">{escape(nombre)}</stringProp>'
            '<stringProp name="Assertion.test_field">Assertion.response_code</stringProp>'
            f'<boolProp name="Assertion.assume_success">true</boolProp><intProp name="Assertion.test_type">{tipo}</intProp>'
            '</ResponseAssertion><hashTree/>')


def peticion(nombre, metodo, ruta, cuerpo=None, hijos=''):
    if cuerpo is None:
        args = ARGS_VACIOS
        raw = ''
    else:
        args = ('<elementProp name="HTTPsampler.Arguments" elementType="Arguments"><collectionProp name="Arguments.arguments">'
                '<elementProp name="" elementType="HTTPArgument"><boolProp name="HTTPArgument.always_encode">false</boolProp>'
                f'<stringProp name="Argument.value">{escape(cuerpo)}</stringProp>'
                '<stringProp name="Argument.metadata">=</stringProp></elementProp></collectionProp></elementProp>')
        raw = '<boolProp name="HTTPSampler.postBodyRaw">true</boolProp>'
    return (f'<HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="{escape(nombre)}" enabled="true">'
            f'{raw}{args}<stringProp name="HTTPSampler.domain"></stringProp><stringProp name="HTTPSampler.port"></stringProp>'
            '<stringProp name="HTTPSampler.protocol"></stringProp>'
            f'<stringProp name="HTTPSampler.path">{escape(ruta)}</stringProp><stringProp name="HTTPSampler.method">{metodo}</stringProp>'
            '<boolProp name="HTTPSampler.follow_redirects">true</boolProp><boolProp name="HTTPSampler.auto_redirects">false</boolProp>'
            '<boolProp name="HTTPSampler.use_keepalive">true</boolProp><boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>'
            f'</HTTPSamplerProxy><hashTree>{hijos}</hashTree>')


def grupo(nombre, hilos, rampa, pausa_ms, contenido):
    return (f'<ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="{escape(nombre)}" enabled="true">'
            '<stringProp name="ThreadGroup.on_sample_error">continue</stringProp>'
            '<elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" '
            'testclass="LoopController" testname="Loop Controller" enabled="true">'
            '<boolProp name="LoopController.continue_forever">false</boolProp><intProp name="LoopController.loops">-1</intProp>'
            f'</elementProp><stringProp name="ThreadGroup.num_threads">{hilos}</stringProp>'
            f'<stringProp name="ThreadGroup.ramp_time">{rampa}</stringProp><boolProp name="ThreadGroup.scheduler">true</boolProp>'
            f'<stringProp name="ThreadGroup.duration">{DURACION}</stringProp><stringProp name="ThreadGroup.delay">0</stringProp>'
            '<boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>'
            f'</ThreadGroup><hashTree>{contenido}'
            f'<ConstantTimer guiclass="ConstantTimerGui" testclass="ConstantTimer" testname="Pausa entre peticiones" enabled="true">'
            f'<stringProp name="ConstantTimer.delay">{pausa_ms}</stringProp></ConstantTimer><hashTree/></hashTree>')


JSON = [('Content-Type', 'application/json')]
f1 = (aserto_codigo('F1 - Respuesta 200 OK', '200', 8)
      + peticion('F1 - GET /api/menu/publico', 'GET', '/api/menu/publico')
      + peticion('F1 - GET /api/menu/promos', 'GET', '/api/menu/promos')
      + peticion('F1 - GET /api/menu/platos/1', 'GET', '/api/menu/platos/1'))
f2 = (aserto_codigo('F2 - Error controlado 4xx (nunca 5xx)', '4\\d\\d', 1)
      + peticion('F2 - POST registro con JSON malformado', 'POST', '/api/auth/registro', '{"nombre": "Ana", ', encabezados(JSON))
      + peticion('F2 - POST registro con datos inválidos', 'POST', '/api/auth/registro', '{"nombre":"Ana","correo":"ana","contrasena":"1"}', encabezados(JSON))
      + peticion('F2 - GET ruta inexistente', 'GET', '/api/no-existe')
      + peticion('F2 - GET plato con ID fuera de rango', 'GET', '/api/menu/platos/99999999999')
      + peticion('F2 - GET staff con token falso', 'GET', '/api/auth/staff', None, encabezados([('Authorization', 'Bearer token-falso')]))
      + peticion('F2 - GET QR con token mal formado', 'GET', '/api/pedidos/verificar-qr/abc'))

xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3"><hashTree>'
       '<TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Operacion Remi - Prueba de Fiabilidad" enabled="true">'
       '<stringProp name="TestPlan.comments">10 minutos de carga continua (F1) con entradas inválidas en paralelo (F2). '
       'Al minuto 4 se apaga la base de datos 30 s para medir la recuperación (F3). RNF-09: disponibilidad mayor o igual a 99 %.</stringProp>'
       '<boolProp name="TestPlan.functional_mode">false</boolProp><boolProp name="TestPlan.tearDown_on_shutdown">true</boolProp>'
       '<boolProp name="TestPlan.serialize_threadgroups">false</boolProp>'
       + variables(SERVIDOR + [
           ('F1_CLIENTES', 'clientes', 30, 'Clientes que consultan el menu (F1)'),
           ('F2_HILOS', 'invalidos', 5, 'Hilos que envian entradas invalidas (F2)'),
           ('DURACION_S', 'duracion', 600, 'Duracion total de la prueba (s)'),
           ('F1_PAUSA_MS', 'pausa1', 500, 'Pausa entre peticiones de F1 (ms)'),
           ('F2_PAUSA_MS', 'pausa2', 1000, 'Pausa entre peticiones de F2 (ms)')]) +
       '<stringProp name="TestPlan.user_define_classpath"></stringProp></TestPlan><hashTree>'
       '<ConfigTestElement guiclass="HttpDefaultsGui" testclass="ConfigTestElement" testname="HTTP Request Defaults" enabled="true">'
       f'{ARGS_VACIOS}<stringProp name="HTTPSampler.domain">${{HOST}}</stringProp><stringProp name="HTTPSampler.port">${{PUERTO}}</stringProp>'
       '<stringProp name="HTTPSampler.protocol">http</stringProp><stringProp name="HTTPSampler.path"></stringProp>'
       '<stringProp name="HTTPSampler.connect_timeout">5000</stringProp><stringProp name="HTTPSampler.response_timeout">10000</stringProp>'
       '</ConfigTestElement><hashTree/>'
       + grupo('F1 - Clientes consultando el menú (F1_CLIENTES)', '${F1_CLIENTES}', 30, '${F1_PAUSA_MS}', f1)
       + grupo('F2 - Entradas inválidas (F2_HILOS)', '${F2_HILOS}', 5, '${F2_PAUSA_MS}', f2)
       + listener('ViewResultsFullVisualizer', 'View Results Tree', solo_errores=True)
       + listener('SummaryReport', 'Summary Report', RESULTADOS)
       + listener('StatVisualizer', 'Aggregate Report')
       + listener('RespTimeGraphVisualizer', 'Response Time Graph', '', '<stringProp name="RespTimeGraph.interval">10000</stringProp>')
       + '</hashTree></hashTree></jmeterTestPlan>\n')
salida = os.path.join(AQUI, 'remi-fiabilidad.jmx')
open(salida, 'w', encoding='utf-8').write(xml)
print(salida, len(xml))
