
const {models} = require('./model');
const {log, biglog, errorlog, colorize} = require("./out");
const Sequelize = require('sequelize');

/**
 * Función de ayuda para los diversos comandos.
 *
 * @param rl  Objeto readline usado para implementar el CLI.
 */
 exports.helpCmd = (socket, rl )=> {
		  log(socket, "Commandos:");
  		log(socket," h|help - Muestra esta ayuda.");
  		log(socket," show <id> - Muestra la pregunta y la respuesta el quiz indicado");
  		log(socket," add - Añadir un nuevo quiz interactivamente.");
  		log(socket," delete <id> - Borrar el quiz indicado.");
  		log(socket," edit <id> - Editar el quiz indicado.");
  	  log(socket," test <id> - Probar ek quiz indicado.");
  		log(socket," p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
  		log(socket," credits - Créditos.");
  		log(socket," q|quit - Salir del programa.");
  		rl.prompt();
 }

/**
 * Lista de todos los quizzes existentes en el modelo.
 *
 * @param rl  Objeto readline usado para implementar el CLI.
 */
 exports.listCmd = (socket,rl) => {
 		models.quiz.findAll()
 		.each(quiz => {
 				log(socket,` [${colorize(quiz.id,'magenta')}]: ${quiz.question}`);
 		})
 		.catch(error => {
 			errorlog(socket,error.message);
 		})
 		.then(()=> {
 			rl.prompt()
 		});
 };

 /**
 * Esta funcion devuelve una promesa que: 
 *		- Valida que se ha introducido un valor para el parametro.
 *		- Convierte el parametro en un numero entero.
 * Si todo va bien, la promesa se satisface y devuelve el valor de id a usar.
 *
 * @param id Parametro con el indice a validar.
 */
 const validateId =(id)  => {

 	return new Sequelize.Promise((resolve,reject) => {
 		if(typeof id === "undefined"){
 			reject(new Error(`Falta el parámetro <id>.`));
 		} else {
 			id = parseInt(id);  //Coge a la parte entera.
 			if (Number.isNaN(id)) {
 				reject(new Error(`El valor del parametro <id> no es un numero.`));
 			} else {
 				resolve(id);
 			}
 		}
 	});
 };

/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl  Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
 exports.showCmd = (socket,rl, id) => {
 		validateId(id)
 		.then(id => models.quiz.findById(id))
 		.then(quiz => {
 			if (!quiz) {
 				throw new Error(`No existe un quiz asociado al id=${id}.`);
 			}
 			log(socket, `[${colorize(quiz.id,'magenta')}]: ${quiz.question} ${colorize('=>','blue')} ${quiz.answer}`);
 		})
 		.catch(error => {
 			errorlog(socket,error.massage);
 		})
 		.then(()=> {
 			rl.prompt();
 		});
 };

/**
*
* Esta funcion devuelve una promesa que cuando se cumple, proporciona el texto introducido
* 
* También colorea en rojo el texto de la pregunta, elimina espacios al principio y al final.
*
* @param rl Objeto readline usado para implementar el CLI.
* @param text Pregunta que hay que hacerle al usuario.
*
*/

const makeQuestion = (rl,text) => {

	return new Sequelize.Promise((resolve,reject)=> {
		rl.question(colorize(text,'red'),answer => {
			resolve(answer.trim());
		});
	});
};

 /**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 *
 * Hay que recordar que el funcionamiento de la función rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada rl.prompt() se debe hacer en la callback de la segunda llamada
 * a rl.question.
 *
 * @param rl  Objeto readline usado para implementar el CLI.
 */
 exports.addCmd =(socket,rl)  => {
 	makeQuestion(rl, 'Introduzca una pregunta: ')
 	.then(q => {
 		return makeQuestion(rl, 'Introduzca la respuesta: ')
 		.then(a => {
 			return {question: q, answer: a};
 		});
 	})
 	.then(quiz => {
 		return models.quiz.create(quiz);
  	})
  	.then((quiz) => {
  		log(socket,`${colorize('Se ha añadido','magenta')}: ${quiz.question} ${colorize('=>','blue')} ${quiz.answer}`);
  	})
  	.catch(Sequelize.ValidationError, erro => {
  		errorlog(socket,'El quiz es erróneo: ');
  		error.errors.forEach(({massage}) => errorlog(socket,massage));
  	})
  	.catch(error => {
  		errorlog(socket,error.massage);
  	})
  	.then(()=> {
  		rl.prompt();
  	});
 };

 /**
 * Prueba un quiz del modelo.
 *
 * @param rl  Objeto readline usado para implementar el CLI.
 * @param id clave del quiz a probar.
 */
 exports.testCmd = (socket,rl, id) => {
  		validateId(id)
 		.then(id => models.quiz.findById(id))
 		.then(quiz => {
 			 	log(socket,`La pregunta es : ${quiz.question}`)

 		return makeQuestion(rl, 'Introduzca la respuesta: ')
 		.then(a => {
 					if(a.toLowerCase().trim() === quiz.answer.toLowerCase()){
 						log(socket,'Su respuesta es CORRECTA');
 					} else {
 						log(socket,'Su respuesta es INCORRECTA');
 					}
 				})
 			})
 		.catch(error => {
  			errorlog(socket,error.massage);
  		})
  		.then(()=> {
  		rl.prompt();
  		});	
 	};

 /**
 * Pregunta todos los quizzes existentes de forma aleatoria.
 * Se gana si se contesta todos satisfactoriamente.
 *
 * @param rl  Objeto readline usado para implementar el CLI.
 */
 exports.playCmd = (socket,rl) => {
 		var points = 0;
 		var toBeResolved = [];						
 		var Questions = 0;

 	models.quiz.findAll()
 	.each(quiz => {
 		++Questions;
 		toBeResolved.lenght = Questions;
 		toBeResolved.push(quiz.id);
 	})
 	.then(()=>{
 		if(Questions==0){
 			log(socket,'No quedan preguntas por contestar','red');
 		} else {
 			playOne();
 		}
 	})
 	.catch(error => {
 		errorlog(socket,error.massage);
 	})
 	.then(() => {
 		rl.prompt();
 	});

 		const playOne = () => {
 			var randomId = Math.floor(Math.random()*(Questions-points));	// numero al azar para el array de id
 			models.quiz.findById(toBeResolved[randomId])

 			.then(quiz => {
 				log(socket,`La pregunta es : ${quiz.question}`); 			 	
				return makeQuestion(rl, 'Introduzca la respuesta: ')
 					.then(a => {
 						if(a.toLowerCase().trim() === quiz.answer.toLowerCase()){	
	 			  			++points;
	 			 			log(socket,`CORRECTA. Lleva ${points} puntos `,'green');
	 			 				if(points < Questions){
	 			 					toBeResolved.splice(randomId, 1);
	 			 					models.quiz.findById(randomId)
	 			 			.then(() => {
	 			 				rl.prompt();
	 			 			})	
	 			 			.then(() => {
	 			 				playOne();
	 			 			});	
	 													// ejecución recursiva
	 		 			} else {
	 		 				log(socket,' HAS ACERTADO TODAS LAS PREGUNTAS, ENHORABUENA!!');
	 		 			}
	 		 		} else {
			 			log(socket,`INCORRECTA`,'red');
	 			 		log(socket,`Ha acertado: ${points} de ${long} preguntas`);
	 			 		log(socket,'FIN DEL JUEGO', 'red');
	 				}
 				})
 			.catch(error => {
  				errorlog(socket,error.massage);
  			});
  		})
 			.catch(error => {
 				errorlog(socket,error.massage);
 		})
  			.then(() => {
  				rl.prompt();
  		});	
 	};
};

 /**
 * Borra el quiz del modelo.
 *
 * @param rl  Objeto readline usado para implementar el CLI.
 * @param id clave del quiz a borrar.
 */
 exports.deleteCmd = (socket,rl, id) => {

 		validateId(id)
 		.then(id => models.quiz.destroy({where: {id}}))
 		.catch(error => {
 			errorlog(socket,error.message);
 		})
 		.then(()=>{
 			rl.prompt();
 		});
 };

 /**
 * Edita el quiz del modelo.
 *
 * Hay que recordar que el funcionamiento de la función rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada rl.prompt() se debe hacer en la callback de la segunda llamada
 * a rl.question.
 *
 * @param rl  Objeto readline usado para implementar el CLI.
 * @param id clave del quiz a editar.
 */
 exports.editCmd = (socket,rl, id) => {
 		validateId(id)
 		.then(id => models.quiz.findById(id)) 
 		.then(quiz => {
 			if(!quiz) {
 				throw new Error(`No existe un quiz asociado a id = ${id}.`);
 			}

 		process.stdout.isTTY && setTimeout(() => { rl.write(quiz.question)},0);
 		return makeQuestion(rl,'Introduzca la pregunta: ')
 		.then(q => {
			process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
 			return makeQuestion(rl,'Introduzca la respuesta')
 			.then(a=> {
 				quiz.question = q;
 				quiz.answer = a;
 				return quiz;
			});
 		});
 	})
	.then(quiz => {
		return quiz.save();
	})
	.then(quiz => {
		log(socket,`${colorize('Se ha añadido','magenta')}: ${quiz.question} ${colorize('=>','blue')} ${quiz.answer}`);
	})
 	.catch(Sequelize.ValidationError,error => {
 		errorlog(socket,'El quiz es erroneo: ');
 		error.erros.forEach(({massage}) => errorlog(socket,massage));
 	})	
 	.catch(error => {
 		errorlog(socket,error.massage);
 	})
 	.then(()=> {
 		rl.prompt();
 	});	
 };

 /**
 * Creditos y nombres de los autores del proyecto.
 *
 * @param rl  Objeto readline usado para implementar el CLI.
 */
 exports.creditsCmd =(socket,rl)  => {
 		log(socket,'Autores de la práctica:');
  		log(socket,'SERGIO DEL RIO LAS HERAS');
  		
  		rl.prompt();
 };

 /**
 * Terminar el programa.
 *
 * @param rl  Objeto readline usado para implemtentar el CLI
 */
 exports.quitCmd = (socket,rl) => {
  		rl.close();
      socket.end();
 };
