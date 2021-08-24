# Of Statement Resolution

## Resolution of Equations

Here in we concern ourselves with the conversion of a set of equations specified as strings to native representations. This is performed sequentially, for each equation, in `Core.resolveEquation()`.

### Univariate Definition

The simplest situation is an equation involving only one undefined variable, which we allow to be either unencountered in previous equations or a previously algebraic variable. If explicit, we invoke `Core.readExplicitDefinition()` to perform definition (currntly the left hand side of the equation is required to be the defineniendum). If implicit, this variable will be initialized with type `ImplicitFunctional`, whose evaluation involves the solving of this equation that defines it. In either case, the variable must appear only once in the equation.

### Systematic Definition

The general problem of statement resolution is understanding the relation of a set of equations involving common variables and propely converting these to native representations. Whether **precedence** should matter in the interpretation of equations is perhaps an important consideration. Naturally, equations are interpreted in a sequential order and as such precedence may offer useful rules for interpretation...

A chain of explicit definitions in the form of, where the expressions to the right are arbitrarily substantiated,

<p align="center">
  <img src="https://github.com/YuelongLi/Pendulum-beta/blob/main/doc/eq-pics/def-chain.gif" />
</p>

Is conveniently handled by first creating `Algebraic` representations of variables yet to be defined and later modifying their types and contents upon further definition. 

This, nevertheless, is still a special form of a set of statements. Univariate equations, when they're present, is amenable to a direct definition, which can later be modified as for chained definitions. What remains appears to be equations implicating multiple undefined variables whose evaluation depends on the grouping of a sufficient number of equations of such mutual variables into a system. As such, the interpretation of an equation involving more than on unknown or algebraic variable demands an intermediate data type, which we denote as `Equation`. An equation can be regarded as a `Variable` in the sense that it bears relation to other variables, so programmatically commodious, though it does not have a *value* as typical variables.

As a `Variable` then, an `Equation` has dependencies though no dependants. Its dependencies are not restricted to algebraic variables that only appear in itself or in other implicit equations but also functions fully defined elsewhere, since its evaluation depends on the evaluation of these constituent functions. To construct such a system of equations, we may proceed as before. On reading a statement with either more than unknown (unseen in the environment) or no unknown and more than one algebraic variable, we construct an `Equation` representation of this equation where the unknowns are made algebraic variables. We use a mapping to account for the related variables and the collection of equations that involve them. Once the number of corresponding equations matches the number of variables involved, a system may be suspected, whereby we may potentially define these variables numerically via root-finding. Such is a *complete* system.

*Incomplete* systems are evaluable by the contextual supply of some of the variable values. Here we substitute the given values and perform root-finding to identify plausible values of the remaining variables.
