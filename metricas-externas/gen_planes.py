"""Genera los planes de JMeter de las métricas externas (sección 3.3), compatibles con la GUI de JMeter 5.6.3.

remi-capacidad.jmx  Eficiencia de desempeño: la carga sube por escalones (200, 400, 800, 1600 y 3200 clientes,
                    45 s cada uno) sobre las tres consultas del cliente. Mide comportamiento temporal y
                    capacidad (hasta cuántos clientes se cumple el RNF-02: respuesta menor a 2 s).
remi-rafaga.jmx     Seguridad, resistencia (TOMA): ráfaga sin pausas de 100 hilos contra el registro y el
                    menú, como un ataque de fuerza bruta o de denegación de servicio. Mide cuántas
                    peticiones mitiga la API con 429 Too Many Requests.

Los parametros (clientes, duracion, pausa, limite de respuesta, servidor) son variables del plan ("User Defined
Variables" del nodo raiz): se cambian ahi en la GUI o al lanzar JMeter con -Jnombre=valor (por ejemplo
-Jclientes1=50). Los resultados se guardan en la carpeta que indique -Jcarpeta.
"""
import os
from xml.sax.saxutils import escape

AQUI = os.path.dirname(os.path.abspath(__file__))

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
    return (f'<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="{nombre}" enabled="true">'
            f'<collectionProp name="Asserion.test_strings"><stringProp name="1">{patron}</stringProp></collectionProp>'
            f'<stringProp name="Assertion.custom_message">{escape(nombre)}</stringProp>'
            '<stringProp name="Assertion.test_field">Assertion.response_code</stringProp>'
            f'<boolProp name="Assertion.assume_success">true</boolProp><intProp name="Assertion.test_type">{tipo}</intProp>'
            '</ResponseAssertion><hashTree/>')


def aserto_duracion(ms):
    return (f'<DurationAssertion guiclass="DurationAssertionGui" testclass="DurationAssertion" '
            f'testname="RNF-02 - Respuesta en menos de LIMITE_MS" enabled="true">'
            f'<stringProp name="DurationAssertion.duration">{ms}</stringProp></DurationAssertion><hashTree/>')


def peticion(nombre, metodo, ruta, cuerpo=None, hijos=''):
    if cuerpo is None:
        args, raw = ARGS_VACIOS, ''
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


def grupo(nombre, hilos, rampa, duracion, pausa_ms, contenido, iteraciones=-1, scheduler=True):
    timer = (f'<ConstantTimer guiclass="ConstantTimerGui" testclass="ConstantTimer" testname="Pausa entre peticiones (PAUSA_MS)" enabled="true">'
             f'<stringProp name="ConstantTimer.delay">{pausa_ms}</stringProp></ConstantTimer><hashTree/>') if pausa_ms else ''
    return (f'<ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="{escape(nombre)}" enabled="true">'
            '<stringProp name="ThreadGroup.on_sample_error">continue</stringProp>'
            '<elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" '
            'testclass="LoopController" testname="Loop Controller" enabled="true">'
            f'<boolProp name="LoopController.continue_forever">false</boolProp><stringProp name="LoopController.loops">{iteraciones}</stringProp>'
            f'</elementProp><stringProp name="ThreadGroup.num_threads">{hilos}</stringProp>'
            f'<stringProp name="ThreadGroup.ramp_time">{rampa}</stringProp><boolProp name="ThreadGroup.scheduler">{str(scheduler).lower()}</boolProp>'
            f'<stringProp name="ThreadGroup.duration">{duracion if scheduler else ""}</stringProp><stringProp name="ThreadGroup.delay">0</stringProp>'
            '<boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>'
            f'</ThreadGroup><hashTree>{contenido}{timer}</hashTree>')


def plan(titulo, comentario, serializar, grupos, jtl, vars_, intervalo_grafica=5000, arbol_solo_errores=False):
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3"><hashTree>'
            f'<TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="{escape(titulo)}" enabled="true">'
            f'<stringProp name="TestPlan.comments">{escape(comentario)}</stringProp>'
            '<boolProp name="TestPlan.functional_mode">false</boolProp><boolProp name="TestPlan.tearDown_on_shutdown">true</boolProp>'
            f'<boolProp name="TestPlan.serialize_threadgroups">{str(serializar).lower()}</boolProp>'
            + variables(SERVIDOR + vars_) +
            '<stringProp name="TestPlan.user_define_classpath"></stringProp></TestPlan><hashTree>'
            '<ConfigTestElement guiclass="HttpDefaultsGui" testclass="ConfigTestElement" testname="HTTP Request Defaults" enabled="true">'
            f'{ARGS_VACIOS}<stringProp name="HTTPSampler.domain">${{HOST}}</stringProp><stringProp name="HTTPSampler.port">${{PUERTO}}</stringProp>'
            '<stringProp name="HTTPSampler.protocol">http</stringProp><stringProp name="HTTPSampler.path"></stringProp>'
            '<stringProp name="HTTPSampler.connect_timeout">5000</stringProp><stringProp name="HTTPSampler.response_timeout">10000</stringProp>'
            '</ConfigTestElement><hashTree/>'
            + ''.join(grupos)
            + listener('ViewResultsFullVisualizer', 'View Results Tree', solo_errores=arbol_solo_errores)
            + listener('SummaryReport', 'Summary Report', jtl)
            + listener('StatVisualizer', 'Aggregate Report')
            + listener('RespTimeGraphVisualizer', 'Response Time Graph', '',
                       f'<stringProp name="RespTimeGraph.interval">{intervalo_grafica}</stringProp>')
            + '</hashTree></hashTree></jmeterTestPlan>\n')


# ---------------------------------------------------------------- capacidad
ESCALONES = [200, 400, 800, 1600, 3200]
VARS_C = ([(f'CLIENTES_{i}', f'clientes{i}', n, f'Clientes concurrentes del escalon {i}') for i, n in enumerate(ESCALONES, 1)]
          + [('DURACION_S', 'duracion', 45, 'Segundos que dura cada escalon'),
             ('RAMPA_S', 'rampa', 10, 'Segundos para arrancar todos los clientes del escalon'),
             ('PAUSA_MS', 'pausa', 300, 'Pausa entre peticiones de cada cliente (ms)'),
             ('LIMITE_MS', 'limite', 2000, 'Tiempo maximo de respuesta aceptado, RNF-02 (ms)')])
grupos_c = []
for i in range(1, len(ESCALONES) + 1):
    e = f'E{i}'
    contenido = (aserto_codigo(f'{e} - Respuesta 200 OK', '200', 8) + aserto_duracion('${LIMITE_MS}')
                 + peticion(f'{e} - GET /api/menu/publico', 'GET', '/api/menu/publico')
                 + peticion(f'{e} - GET /api/menu/promos', 'GET', '/api/menu/promos')
                 + peticion(f'{e} - GET /api/menu/platos/1', 'GET', '/api/menu/platos/1'))
    grupos_c.append(grupo(f'{e} - Escalon {i} (CLIENTES_{i} clientes)', f'${{CLIENTES_{i}}}', '${RAMPA_S}',
                          '${DURACION_S}', '${PAUSA_MS}', contenido))
open(os.path.join(AQUI, 'remi-capacidad.jmx'), 'w', encoding='utf-8').write(plan(
    'Operacion Remi - Capacidad y utilizacion de recursos',
    'Cinco escalones de carga, uno despues del otro. Los clientes de cada escalon, la duracion, la pausa y el limite '
    'de respuesta se cambian en las variables de este nodo. Criterio: RNF-02, respuesta menor a LIMITE_MS. '
    'El monitor recursos.ps1 registra la CPU y la memoria del backend.',
    True, grupos_c, '${__P(carpeta,.)}/capacidad.jtl', VARS_C, arbol_solo_errores=True))

# ---------------------------------------------------------------- rafaga (TOMA)
VARS_R = [('HILOS', 'hilos', 100, 'Hilos atacantes simultaneos'),
          ('ITERACIONES', 'iteraciones', 50, 'Veces que cada hilo repite el ataque')]
JSON = [('Content-Type', 'application/json')]
rafaga = (aserto_codigo('R - Ataque mitigado con 429', '429', 8)
          + peticion('R - POST /api/auth/registro (fuerza bruta)', 'POST', '/api/auth/registro',
                     '{"nombre":"Atacante","correo":"x","contrasena":"1"}', encabezados(JSON))
          + peticion('R - GET /api/menu/promos (denegacion de servicio)', 'GET', '/api/menu/promos'))
open(os.path.join(AQUI, 'remi-rafaga.jmx'), 'w', encoding='utf-8').write(plan(
    'Operacion Remi - Rafaga de ataque (resistencia)',
    'Rafaga sin pausas: HILOS x ITERACIONES contra el registro y el menu. '
    'La asercion espera 429 Too Many Requests: cada peticion que no se mitiga queda como fallida.',
    False, [grupo('R - Rafaga (HILOS hilos)', '${HILOS}', 5, 0, 0, rafaga, iteraciones='${ITERACIONES}', scheduler=False)],
    '${__P(carpeta,.)}/rafaga.jtl', VARS_R, 1000))
print('ok')
